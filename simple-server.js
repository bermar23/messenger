const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3000;

// In-memory storage
const connectedUsers = new Map();
const chatMessages = [];

console.log('Starting Project Messenger server...');

// Simple test route
app.get('/test', (req, res) => {
    res.json({ message: 'Server is working!' });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        users: connectedUsers.size, 
        messages: chatMessages.length,
        timestamp: new Date().toISOString()
    });
});

// Main chat page
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Messenger</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="/socket.io/socket.io.js"></script>
</head>
<body class="bg-gray-100 min-h-screen">
    <div class="container mx-auto max-w-4xl h-screen flex flex-col">
        <!-- Header -->
        <div class="bg-white shadow-sm p-4 border-b">
            <h1 class="text-2xl font-bold text-gray-900">Project Messenger</h1>
            <p class="text-gray-600">Real-time messaging application</p>
        </div>

        <!-- Login Section -->
        <div id="login-section" class="flex-1 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                <h2 class="text-xl font-semibold mb-4">Join the Chat</h2>
                <form id="login-form">
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Username</label>
                        <input type="text" id="username" required 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                               placeholder="Enter your username">
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Email (optional)</label>
                        <input type="email" id="email"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                               placeholder="Enter your email">
                    </div>
                    <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
                        Join Chat
                    </button>
                </form>
                <div id="login-status" class="mt-4 text-sm text-gray-600"></div>
            </div>
        </div>

        <!-- Chat Section -->
        <div id="chat-section" class="hidden flex-1 flex flex-col">
            <div class="flex-1 flex">
                <!-- Messages -->
                <div class="flex-1 flex flex-col">
                    <div id="messages" class="flex-1 overflow-y-auto p-4 space-y-2 bg-white">
                        <div class="text-center text-gray-500">No messages yet. Start the conversation!</div>
                    </div>
                    
                    <!-- Message Input -->
                    <div class="border-t p-4 bg-white">
                        <div class="flex space-x-2">
                            <input type="text" id="message-input" 
                                   class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                   placeholder="Type a message..." maxlength="500">
                            <button id="emoji-btn" class="px-3 py-2 text-gray-600 hover:text-gray-800">😊</button>
                            <button id="send-btn" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Send</button>
                        </div>
                        <div class="flex justify-between mt-2 text-xs text-gray-500">
                            <span id="char-count">0/500</span>
                            <span id="connection-status">Connecting...</span>
                        </div>
                    </div>
                </div>

                <!-- Users List -->
                <div class="w-64 bg-gray-50 border-l p-4">
                    <h3 class="font-semibold mb-4">Online Users (<span id="user-count">0</span>)</h3>
                    <div id="users-list" class="space-y-2">
                        <div class="text-gray-500 text-sm">No users online</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let socket;
        let currentUser = null;
        let messages = [];
        let users = [];

        const loginSection = document.getElementById('login-section');
        const chatSection = document.getElementById('chat-section');
        const loginForm = document.getElementById('login-form');
        const loginStatus = document.getElementById('login-status');
        const messagesDiv = document.getElementById('messages');
        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');
        const emojiBtn = document.getElementById('emoji-btn');
        const charCount = document.getElementById('char-count');
        const connectionStatus = document.getElementById('connection-status');
        const usersList = document.getElementById('users-list');
        const userCount = document.getElementById('user-count');

        function initSocket() {
            socket = io();
            
            socket.on('connect', () => {
                connectionStatus.textContent = 'Connected';
                connectionStatus.className = 'text-green-600';
            });
            
            socket.on('disconnect', () => {
                connectionStatus.textContent = 'Disconnected';
                connectionStatus.className = 'text-red-600';
            });
            
            socket.on('chat:message', (message) => {
                messages.push(message);
                renderMessages();
            });
            
            socket.on('chat:history', (messageHistory) => {
                messages = messageHistory;
                renderMessages();
            });
            
            socket.on('users:list', (userList) => {
                users = userList;
                renderUsers();
            });
        }

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const email = document.getElementById('email').value.trim();
            
            if (!username) {
                loginStatus.textContent = 'Username is required';
                loginStatus.className = 'mt-4 text-sm text-red-600';
                return;
            }
            
            loginStatus.textContent = 'Joining chat...';
            loginStatus.className = 'mt-4 text-sm text-blue-600';
            
            try {
                currentUser = {
                    id: Math.random().toString(36).substring(2) + Date.now().toString(36),
                    username,
                    email: email || undefined,
                    ipAddress: 'localhost',
                    location: 'Local',
                    joinedAt: new Date()
                };
                
                socket.emit('user:join', currentUser);
                showChatRoom();
                
            } catch (error) {
                loginStatus.textContent = 'Failed to join chat. Please try again.';
                loginStatus.className = 'mt-4 text-sm text-red-600';
            }
        });

        sendBtn.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

        messageInput.addEventListener('input', (e) => {
            charCount.textContent = e.target.value.length + '/500';
        });

        emojiBtn.addEventListener('click', () => {
            const emojis = ['😊', '😂', '❤️', '👍', '🎉', '🔥', '💯', '😎'];
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            sendMessageContent(randomEmoji, 'emoji');
        });

        function showChatRoom() {
            loginSection.classList.add('hidden');
            chatSection.classList.remove('hidden');
            messageInput.focus();
        }

        function sendMessage() {
            const content = messageInput.value.trim();
            if (content) {
                sendMessageContent(content, 'text');
                messageInput.value = '';
                charCount.textContent = '0/500';
            }
        }

        function sendMessageContent(content, type) {
            if (!socket || !currentUser) return;
            
            const messageData = {
                userId: currentUser.id,
                username: currentUser.username,
                content: content,
                type: type,
                timestamp: new Date()
            };
            
            socket.emit('chat:message', messageData);
        }

        function renderMessages() {
            if (messages.length === 0) {
                messagesDiv.innerHTML = '<div class="text-center text-gray-500">No messages yet. Start the conversation!</div>';
                return;
            }
            
            const messagesHtml = messages.map(message => {
                const isOwn = message.userId === currentUser?.id;
                const time = new Date(message.timestamp).toLocaleTimeString();
                
                return \`
                    <div class="flex \${isOwn ? 'justify-end' : 'justify-start'}">
                        <div class="max-w-xs px-4 py-2 rounded-lg \${
                            isOwn ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900'
                        }">
                            \${!isOwn ? \`<div class="text-xs font-medium mb-1 opacity-75">\${message.username}</div>\` : ''}
                            <div class="\${message.type === 'emoji' ? 'text-xl' : 'text-sm'}">\${message.content}</div>
                            <div class="text-xs mt-1 opacity-75">\${time}</div>
                        </div>
                    </div>
                \`;
            }).join('');
            
            messagesDiv.innerHTML = messagesHtml;
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function renderUsers() {
            userCount.textContent = users.length;
            
            if (users.length === 0) {
                usersList.innerHTML = '<div class="text-gray-500 text-sm">No users online</div>';
                return;
            }
            
            const usersHtml = users.map(user => {
                const isCurrentUser = user.id === currentUser?.id;
                
                return \`
                    <div class="p-2 rounded bg-white border \${isCurrentUser ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}">
                        <div class="font-medium text-sm">\${user.username}\${isCurrentUser ? ' (You)' : ''}</div>
                        \${user.email ? \`<div class="text-xs text-gray-600">\${user.email}</div>\` : ''}
                        <div class="text-xs text-gray-500">📍 \${user.location || 'Unknown'}</div>
                    </div>
                \`;
            }).join('');
            
            usersList.innerHTML = usersHtml;
        }

        // Initialize
        initSocket();
    </script>
</body>
</html>
    `);
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.emit('chat:history', chatMessages);
    socket.emit('users:list', Array.from(connectedUsers.values()));

    socket.on('user:join', (user) => {
        console.log('User joined:', user.username);
        
        connectedUsers.set(socket.id, user);
        io.emit('users:list', Array.from(connectedUsers.values()));
        
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
        
        console.log('New message from', message.username + ':', message.content);
        
        chatMessages.push(message);
        
        if (chatMessages.length > 100) {
            chatMessages.splice(0, chatMessages.length - 100);
        }
        
        io.emit('chat:message', message);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        const user = connectedUsers.get(socket.id);
        if (user) {
            connectedUsers.delete(socket.id);
            io.emit('users:list', Array.from(connectedUsers.values()));
            
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
    console.log(`🚀 Project Messenger server running on port ${port}`);
    console.log(`📱 Open your browser and go to: http://localhost:${port}`);
    console.log(`🌐 Socket.io ready for real-time messaging`);
});

process.on('SIGINT', () => {
    console.log('\n👋 Shutting down Project Messenger server...');
    process.exit(0);
});
