import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: string;
  conversationId: string;
}

interface HybridSocketEvents {
  'message:new': (message: Message) => void;
  'user:list': (users: any[]) => void;
  'conversation:participants': (participants: any[]) => void;
  'conversation:cleared': () => void;
  'message:private:new': (message: any) => void;
  'connect': () => void;
  'disconnect': (reason: string) => void;
  'connect_error': (error: Error) => void;
}

class HybridSocketManager {
  private socket: Socket | null = null;
  private isConnected = false;
  private fallbackMode = false;
  private lastMessageTimestamp: string | null = null;
  private currentConversationId: string | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private eventHandlers: Map<string, Function[]> = new Map();
  private baseUrl: string = '';

  connect(serverUrl?: string): void {
    this.baseUrl = serverUrl || process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
    
    // Try Socket.io first
    this.connectSocket();
    
    // Set up fallback after a delay
    setTimeout(() => {
      if (!this.isConnected) {
        console.log('Socket.io connection failed, switching to HTTP polling fallback');
        this.enableFallbackMode();
      }
    }, 5000);
  }

  private connectSocket(): void {
    if (this.socket && this.socket.connected) {
      return;
    }

    // Configuration optimized for serverless environments like Vercel
    this.socket = io(this.baseUrl, {
      // Prioritize polling for better serverless compatibility
      transports: ['polling', 'websocket'],
      upgrade: false, // Don't try to upgrade to WebSocket in production
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 15000,
      forceNew: false,
      multiplex: true,
      // Force polling in production environments
      ...(process.env.NODE_ENV === 'production' ? {
        transports: ['polling'],
        upgrade: false,
        rememberUpgrade: false,
        timeout: 20000,
        reconnectionAttempts: 3,
      } : {})
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.fallbackMode = false;
      this.triggerEvent('connect');
      console.log('Connected to server via Socket.io');
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      this.triggerEvent('disconnect', reason);
      console.log('Disconnected from server:', reason);
      
      // Enable fallback mode if disconnection wasn't intentional
      if (reason === 'io server disconnect' || reason === 'transport error') {
        this.enableFallbackMode();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.triggerEvent('connect_error', error);
      
      // Enable fallback after connection errors
      setTimeout(() => {
        if (!this.isConnected) {
          this.enableFallbackMode();
        }
      }, 2000);
    });

    // Forward all Socket.io events
    this.socket.onAny((eventName, ...args) => {
      this.triggerEvent(eventName, ...args);
    });
  }

  private enableFallbackMode(): void {
    if (this.fallbackMode) return;
    
    this.fallbackMode = true;
    this.isConnected = true; // Simulate connection for the fallback mode
    this.triggerEvent('connect');
    console.log('Enabled HTTP polling fallback mode');
    
    // Start polling for new messages
    if (this.currentConversationId) {
      this.startPolling();
    }
  }

  private startPolling(): void {
    if (this.pollingInterval || !this.fallbackMode || !this.currentConversationId) {
      return;
    }

    const pollForMessages = async () => {
      try {
        const params = new URLSearchParams();
        if (this.lastMessageTimestamp) {
          params.append('since', this.lastMessageTimestamp);
        }
        
        const response = await fetch(
          `${this.baseUrl}/api/messages/${this.currentConversationId}?${params}`
        );
        
        if (response.ok) {
          const data = await response.json();
          this.lastMessageTimestamp = data.timestamp;
          
          data.messages.forEach((message: Message) => {
            this.triggerEvent('message:new', message);
          });
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // Poll every 2 seconds
    this.pollingInterval = setInterval(pollForMessages, 2000);
    
    // Also poll immediately
    pollForMessages();
  }

  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  // Join a conversation
  joinConversation(conversationId: string): void {
    this.currentConversationId = conversationId;
    
    if (this.socket && this.isConnected && !this.fallbackMode) {
      this.socket.emit('conversation:join', { conversationId });
    } else if (this.fallbackMode) {
      this.startPolling();
    }
  }

  // Send a message
  async sendMessage(conversationId: string, message: { userId: string; username: string; text: string }): Promise<void> {
    if (this.socket && this.isConnected && !this.fallbackMode) {
      // Use Socket.io
      this.socket.emit('message:send', {
        conversationId,
        text: message.text
      });
    } else {
      // Use REST API fallback
      try {
        const response = await fetch(`${this.baseUrl}/api/messages/${conversationId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: message.userId,
            username: message.username,
            text: message.text
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to send message');
        }
      } catch (error) {
        console.error('Failed to send message via REST API:', error);
        throw error;
      }
    }
  }

  // Event handling
  on<K extends keyof HybridSocketEvents>(event: K, callback: HybridSocketEvents[K]): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(callback);
  }

  private triggerEvent(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  // Send events to server
  emit(event: string, data?: any): void {
    if (this.socket && this.isConnected && !this.fallbackMode) {
      this.socket.emit(event, data);
    } else {
      console.warn(`Cannot emit ${event} in fallback mode`);
    }
  }

  disconnect(): void {
    this.stopPolling();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.fallbackMode = false;
  }

  isSocketConnected(): boolean {
    return this.isConnected;
  }

  isFallbackMode(): boolean {
    return this.fallbackMode;
  }
}

export const hybridSocketManager = new HybridSocketManager();
export type { Message, HybridSocketEvents };
