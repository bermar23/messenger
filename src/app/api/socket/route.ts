import { Server as HttpServer, createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { User, Message, Conversation, PrivateMessage } from '@/types';

// In-memory storage (use Redis or database in production)
const connectedUsers = new Map<string, User>();
const conversations = new Map<string, Conversation>();
const conversationMessages = new Map<string, Message[]>();
const privateMessages = new Map<string, PrivateMessage[]>();
const userSockets = new Map<string, string>(); // userId -> socketId

// Default public conversation
const defaultConversation: Conversation = {
  id: 'public',
  name: 'General Chat',
  type: 'public',
  createdBy: 'system',
  createdAt: new Date(),
  participants: [],
  isActive: true,
};

conversations.set('public', defaultConversation);
conversationMessages.set('public', []);

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

  // Helper function to safely emit to rooms
  const safeEmit = (room: string, event: string, data?: any) => {
    if (io) {
      io.to(room).emit(event, data);
    }
  };

  const safeEmitToSocket = (socketId: string, event: string, data?: any) => {
    if (io) {
      io.to(socketId).emit(event, data);
    }
  };

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join conversation
    socket.on('conversation:join', (data: { conversationId: string; user: User }) => {
      const { conversationId, user } = data;
      const conversation = conversations.get(conversationId);
      
      if (!conversation) {
        socket.emit('error', { message: 'Conversation not found' });
        return;
      }

      // Store user and socket mapping
      user.isOnline = true;
      connectedUsers.set(socket.id, user);
      userSockets.set(user.id, socket.id);
      
      // Join socket room
      socket.join(conversationId);
      
      // Add user to conversation participants
      if (!conversation.participants.includes(user.id)) {
        conversation.participants.push(user.id);
      }

      // Send conversation data
      const messages = conversationMessages.get(conversationId) || [];
      socket.emit('conversation:history', { 
        conversation, 
        messages: messages.slice(-50) // Last 50 messages
      });
      
      // Send current participants
      const participants = conversation.participants
        .map(id => Array.from(connectedUsers.values()).find(u => u.id === id))
        .filter(Boolean);
      
      safeEmit(conversationId, 'conversation:participants', participants);
      
      // Send join message
      const joinMessage: Message = {
        id: uuidv4(),
        userId: 'system',
        username: 'System',
        content: `${user.username} joined the conversation`,
        type: 'system',
        timestamp: new Date(),
        conversationId,
      };
      
      messages.push(joinMessage);
      safeEmit(conversationId, 'message:new', joinMessage);
      
      console.log(`User ${user.username} joined conversation ${conversationId}`);
    });

    // Send message to conversation
    socket.on('message:send', (data: { conversationId: string; content: string; type?: 'text' | 'emoji' }) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      const { conversationId, content, type = 'text' } = data;
      const messages = conversationMessages.get(conversationId);
      if (!messages) return;

      const message: Message = {
        id: uuidv4(),
        userId: user.id,
        username: user.username,
        content,
        type,
        timestamp: new Date(),
        conversationId,
      };
      
      messages.push(message);
      
      // Keep only last 100 messages per conversation
      if (messages.length > 100) {
        messages.splice(0, messages.length - 100);
      }
      
      safeEmit(conversationId, 'message:new', message);
      console.log(`Message sent in ${conversationId}:`, message.content);
    });

    // Send private message
    socket.on('message:private', (data: { recipientId: string; content: string }) => {
      const sender = connectedUsers.get(socket.id);
      if (!sender) return;

      const { recipientId, content } = data;
      const recipientSocketId = userSockets.get(recipientId);
      
      const privateMessage: PrivateMessage = {
        id: uuidv4(),
        senderId: sender.id,
        recipientId,
        content,
        timestamp: new Date(),
        conversationId: `private_${[sender.id, recipientId].sort().join('_')}`,
        isRead: false,
      };

      // Store private message
      const key = privateMessage.conversationId;
      if (!privateMessages.has(key)) {
        privateMessages.set(key, []);
      }
      privateMessages.get(key)!.push(privateMessage);

      // Send to both sender and recipient
      socket.emit('message:private:new', privateMessage);
      if (recipientSocketId) {
        safeEmitToSocket(recipientSocketId, 'message:private:new', privateMessage);
      }

      console.log(`Private message from ${sender.username} to ${recipientId}`);
    });

    // Create new conversation
    socket.on('conversation:create', (data: { name: string; type: 'public' | 'private' }) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      const conversation: Conversation = {
        id: uuidv4(),
        name: data.name,
        type: data.type,
        createdBy: user.id,
        createdAt: new Date(),
        participants: [user.id],
        isActive: true,
        inviteCode: data.type === 'private' ? uuidv4().substring(0, 8) : undefined,
      };

      conversations.set(conversation.id, conversation);
      conversationMessages.set(conversation.id, []);

      socket.emit('conversation:created', conversation);
      console.log(`Conversation created: ${conversation.name} by ${user.username}`);
    });

    // Join conversation by invite code
    socket.on('conversation:join-by-invite', (data: { inviteCode: string; user: User }) => {
      const conversation = Array.from(conversations.values()).find(c => c.inviteCode === data.inviteCode);
      
      if (!conversation) {
        socket.emit('error', { message: 'Invalid invite code' });
        return;
      }

      // Emit join event to be handled by conversation:join
      socket.emit('conversation:join', { conversationId: conversation.id, user: data.user });
    });

    // Get conversation list
    socket.on('conversations:list', () => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      const userConversations = Array.from(conversations.values()).filter(conv => 
        conv.type === 'public' || conv.participants.includes(user.id)
      );

      socket.emit('conversations:list', userConversations);
    });

    // Clear conversation messages (admin/creator only)
    socket.on('conversation:clear', (data: { conversationId: string }) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      const conversation = conversations.get(data.conversationId);
      if (!conversation) return;

      // Only creator or system can clear
      if (conversation.createdBy !== user.id && user.id !== 'system') {
        socket.emit('error', { message: 'Permission denied' });
        return;
      }

      conversationMessages.set(data.conversationId, []);
      
      const clearMessage: Message = {
        id: uuidv4(),
        userId: 'system',
        username: 'System',
        content: `Chat cleared by ${user.username}`,
        type: 'system',
        timestamp: new Date(),
        conversationId: data.conversationId,
      };

      conversationMessages.get(data.conversationId)!.push(clearMessage);
      safeEmit(data.conversationId, 'conversation:cleared');
      safeEmit(data.conversationId, 'message:new', clearMessage);
    });

    // User logout
    socket.on('user:logout', () => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      // Remove from all conversations
      for (const [conversationId, conversation] of conversations) {
        if (conversation.participants.includes(user.id)) {
          const leaveMessage: Message = {
            id: uuidv4(),
            userId: 'system',
            username: 'System',
            content: `${user.username} left the conversation`,
            type: 'system',
            timestamp: new Date(),
            conversationId,
          };

          const messages = conversationMessages.get(conversationId);
          if (messages) {
            messages.push(leaveMessage);
            safeEmit(conversationId, 'message:new', leaveMessage);
          }

          // Remove from participants
          conversation.participants = conversation.participants.filter(id => id !== user.id);
          safeEmit(conversationId, 'conversation:participants', 
            conversation.participants
              .map(id => Array.from(connectedUsers.values()).find(u => u.id === id))
              .filter(Boolean)
          );
        }
      }

      connectedUsers.delete(socket.id);
      userSockets.delete(user.id);
      console.log(`User ${user.username} logged out`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      
      const user = connectedUsers.get(socket.id);
      if (user) {
        user.isOnline = false;
        
        // Update participants in all conversations
        for (const [conversationId, conversation] of conversations) {
          if (conversation.participants.includes(user.id)) {
            const participants = conversation.participants
              .map(id => Array.from(connectedUsers.values()).find(u => u.id === id))
              .filter(Boolean);
            
            safeEmit(conversationId, 'conversation:participants', participants);
          }
        }

        connectedUsers.delete(socket.id);
        userSockets.delete(user.id);
      }
    });
  });

  return io;
}

export async function GET() {
  console.log('Socket.io endpoint hit');
  initializeSocket();
  return new Response('Socket.io server initialized', { status: 200 });
}
