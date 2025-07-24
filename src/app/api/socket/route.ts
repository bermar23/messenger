import { NextRequest } from 'next/server';
import { Server as HttpServer, createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

// In-memory storage (use Redis or database in production)
const connectedUsers = new Map<string, any>();
const chatMessages: any[] = [];

let io: SocketIOServer | null = null;
let httpServer: HttpServer | null = null;

function initializeSocket() {
  if (io) return io;

  httpServer = createServer();
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Send chat history to new user
    socket.emit('chat:history', chatMessages);
    
    // Send current users list
    socket.emit('users:list', Array.from(connectedUsers.values()));

    socket.on('user:join', (user) => {
      console.log('User joined:', user.username);
      
      // Store user
      connectedUsers.set(socket.id, user);
      
      // Broadcast updated users list
      io?.emit('users:list', Array.from(connectedUsers.values()));
      
      // Send join message
      const joinMessage = {
        id: uuidv4(),
        userId: 'system',
        username: 'System',
        content: `${user.username} joined the chat`,
        type: 'text',
        timestamp: new Date(),
      };
      
      chatMessages.push(joinMessage);
      io?.emit('chat:message', joinMessage);
    });

    socket.on('chat:message', (messageData) => {
      const message = {
        id: uuidv4(),
        ...messageData,
      };
      
      console.log('New message:', message);
      
      // Store message
      chatMessages.push(message);
      
      // Keep only last 100 messages in memory
      if (chatMessages.length > 100) {
        chatMessages.splice(0, chatMessages.length - 100);
      }
      
      // Broadcast message to all clients
      io?.emit('chat:message', message);
    });

    socket.on('user:leave', (userId) => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        console.log('User left:', user.username);
        
        connectedUsers.delete(socket.id);
        
        // Broadcast updated users list
        io?.emit('users:list', Array.from(connectedUsers.values()));
        
        // Send leave message
        const leaveMessage = {
          id: uuidv4(),
          userId: 'system',
          username: 'System',
          content: `${user.username} left the chat`,
          type: 'text',
          timestamp: new Date(),
        };
        
        chatMessages.push(leaveMessage);
        io?.emit('chat:message', leaveMessage);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      
      const user = connectedUsers.get(socket.id);
      if (user) {
        connectedUsers.delete(socket.id);
        
        // Broadcast updated users list
        io?.emit('users:list', Array.from(connectedUsers.values()));
        
        // Send disconnect message
        const disconnectMessage = {
          id: uuidv4(),
          userId: 'system',
          username: 'System',
          content: `${user.username} disconnected`,
          type: 'text',
          timestamp: new Date(),
        };
        
        chatMessages.push(disconnectMessage);
        io?.emit('chat:message', disconnectMessage);
      }
    });
  });

  return io;
}

export async function GET(request: NextRequest) {
  console.log('Socket.io endpoint hit');
  initializeSocket();
  return new Response('Socket.io server initialized', { status: 200 });
}
