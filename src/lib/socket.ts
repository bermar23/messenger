import { io, Socket } from 'socket.io-client';

class SocketManager {
  private socket: Socket | null = null;
  private isConnected = false;

  connect(serverUrl?: string): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    // Use environment variable or default to same origin
    const url = serverUrl || process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
    
    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
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
