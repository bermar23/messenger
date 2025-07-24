import { io, Socket } from 'socket.io-client';

// Note: For production deployment on Vercel, consider using hybrid-socket.ts
// which includes HTTP polling fallback for better serverless compatibility

class SocketManager {
  private socket: Socket | null = null;
  private isConnected = false;

  connect(serverUrl?: string): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    // Use environment variable or default to same origin
    const url = serverUrl || process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
    
    // Configuration optimized for serverless environments like Vercel
    this.socket = io(url, {
      // Prioritize polling for better serverless compatibility
      transports: ['polling', 'websocket'],
      // Disable automatic WebSocket upgrade initially
      upgrade: false,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      // Additional options for production
      forceNew: false,
      multiplex: true,
      // Increase polling frequency for better real-time feel
      ...(process.env.NODE_ENV === 'production' ? {
        transports: ['polling'], // Force polling in production
        upgrade: false, // Disable WebSocket upgrade in production
        rememberUpgrade: false,
        timeout: 30000,
        reconnectionAttempts: 15,
      } : {})
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('Connected to server at:', url);
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log('Disconnected from server:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }
}

export const socketManager = new SocketManager();
