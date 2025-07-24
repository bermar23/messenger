const { createServer } = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const port = process.env.SOCKET_PORT || 3002;

// In-memory storage
const connectedUsers = new Map();
const chatMessages = [];

const httpServer = createServer();
const io = new Server(httpServer, {
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
    io.emit('users:list', Array.from(connectedUsers.values()));
    
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
    io.emit('chat:message', joinMessage);
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
    io.emit('chat:message', message);
  });

  socket.on('user:leave', (userId) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      console.log('User left:', user.username);
      
      connectedUsers.delete(socket.id);
      
      // Broadcast updated users list
      io.emit('users:list', Array.from(connectedUsers.values()));
      
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
      io.emit('chat:message', leaveMessage);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const user = connectedUsers.get(socket.id);
    if (user) {
      connectedUsers.delete(socket.id);
      
      // Broadcast updated users list
      io.emit('users:list', Array.from(connectedUsers.values()));
      
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
      io.emit('chat:message', disconnectMessage);
    }
  });
});

httpServer.listen(port, () => {
  console.log(`Socket.io server running on port ${port}`);
});
