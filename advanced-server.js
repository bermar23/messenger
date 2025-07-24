const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3000;

// In-memory storage (use Redis or database in production)
const connectedUsers = new Map();
const conversations = new Map();
const conversationMessages = new Map();
const privateMessages = new Map();
const userSockets = new Map(); // userId -> socketId
const userCredentials = new Map(); // username -> {hashedPassword, salt}

// Default public conversation
const defaultConversation = {
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

console.log('Starting Project Messenger server...');

// Simple password hashing (use bcrypt in production)
function hashPassword(password, salt) {
    const crypto = require('crypto');
    return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

function generateSalt() {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
}

function verifyPassword(password, hashedPassword, salt) {
    return hashPassword(password, salt) === hashedPassword;
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        users: connectedUsers.size, 
        conversations: conversations.size,
        timestamp: new Date().toISOString()
    });
});

// REST API endpoints for fallback when Socket.io isn't working
app.use(express.json());

// Get messages for a conversation
app.get('/api/messages/:conversationId', (req, res) => {
    const { conversationId } = req.params;
    const { since } = req.query;
    
    let messages = conversationMessages.get(conversationId) || [];
    
    if (since) {
        const sinceTime = new Date(since);
        messages = messages.filter(msg => new Date(msg.timestamp) > sinceTime);
    }
    
    res.json({ messages, timestamp: new Date().toISOString() });
});

// Send a message via REST API
app.post('/api/messages/:conversationId', (req, res) => {
    const { conversationId } = req.params;
    const { userId, text, username } = req.body;
    
    if (!text || !userId || !username) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const message = {
        id: uuidv4(),
        userId,
        username,
        text,
        timestamp: new Date(),
        conversationId
    };
    
    // Store message
    if (!conversationMessages.has(conversationId)) {
        conversationMessages.set(conversationId, []);
    }
    
    const messages = conversationMessages.get(conversationId);
    messages.push(message);
    
    // Keep only last 1000 messages
    if (messages.length > 1000) {
        messages.splice(0, messages.length - 1000);
    }
    
    // Try to emit via Socket.io if available
    try {
        io?.to(conversationId).emit('message', message);
    } catch (error) {
        console.log('Socket.io not available, message saved for polling');
    }
    
    res.json({ success: true, message });
});

// Get online users
app.get('/api/users', (req, res) => {
    const users = Array.from(connectedUsers.values());
    res.json({ users, timestamp: new Date().toISOString() });
});

// Long polling endpoint for real-time updates
app.get('/api/poll/:conversationId', (req, res) => {
    const { conversationId } = req.params;
    const { since } = req.query;
    
    // Set timeout for long polling
    const timeout = setTimeout(() => {
        res.json({ messages: [], timestamp: new Date().toISOString() });
    }, 30000); // 30 second timeout
    
    // Check for new messages immediately
    let messages = conversationMessages.get(conversationId) || [];
    if (since) {
        const sinceTime = new Date(since);
        messages = messages.filter(msg => new Date(msg.timestamp) > sinceTime);
    }
    
    if (messages.length > 0) {
        clearTimeout(timeout);
        return res.json({ messages, timestamp: new Date().toISOString() });
    }
    
    // Store the response object for later use
    if (!global.pollingClients) {
        global.pollingClients = new Map();
    }
    
    const clientId = uuidv4();
    global.pollingClients.set(clientId, { res, conversationId, since: since || new Date().toISOString() });
    
    // Clean up when client disconnects
    req.on('close', () => {
        clearTimeout(timeout);
        global.pollingClients?.delete(clientId);
    });
});

// Main chat page with all advanced features
app.get('/', (req, res) => {
    const inviteCode = req.query.invite || '';
    
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Messenger - Advanced</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        .conversation-active { background-color: #3b82f6; color: white; }
        .message-private { background-color: #f3e8ff; border-left: 4px solid #8b5cf6; }
        .message-system { background-color: #fef3c7; color: #92400e; text-align: center; font-style: italic; }
        .user-online::before { content: '●'; color: #10b981; margin-right: 8px; }
        .user-offline::before { content: '●'; color: #6b7280; margin-right: 8px; }
        .sidebar { width: 250px; min-width: 250px; }
    </style>
</head>
<body class="bg-gray-100 min-h-screen">
    <!-- Login Section -->
    <div id="login-section" class="min-h-screen flex items-center justify-center p-4">
        <div class="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
            <div class="text-center mb-8">
                <h1 class="text-3xl font-bold text-gray-900 mb-2">Project Messenger</h1>
                <p class="text-gray-600">Advanced real-time messaging</p>
                ${inviteCode ? `
                <div class="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div class="flex items-center space-x-2">
                        <span class="text-purple-600">🔒</span>
                        <span class="text-purple-800 font-medium">Private Invitation</span>
                    </div>
                    <p class="text-purple-700 text-sm mt-1">You've been invited to join a private conversation</p>
                    <p class="text-purple-600 text-xs mt-1 font-mono">Code: ${inviteCode}</p>
                </div>
                ` : ''}
            </div>

            <form id="login-form" class="space-y-6">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Username</label>
                    <input type="text" id="username" 
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                           placeholder="Enter your username" required>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Email (optional)</label>
                    <input type="email" id="email" 
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                           placeholder="Enter your email">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Security Code/Password</label>
                    <input type="password" id="password" 
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                           placeholder="Enter your security code" required>
                    <p id="password-hint" class="text-xs text-gray-500 mt-1">
                        If this is your first time, create a new security code. Otherwise, enter your existing code.
                    </p>
                </div>
                
                <div class="flex items-center space-x-2">
                    <input type="checkbox" id="is-new-user" class="rounded">
                    <label for="is-new-user" class="text-sm text-gray-700">I'm a new user (create new security code)</label>
                </div>
                
                <button type="submit" 
                        class="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors">
                    ${inviteCode ? 'Join Private Conversation' : 'Join General Chat'}
                </button>
            </form>
        </div>
    </div>

    <!-- Chat Interface -->
    <div id="chat-section" class="h-screen flex bg-gray-100" style="display: none;">
        <!-- Conversation Sidebar -->
        <div class="sidebar bg-gray-900 text-white flex flex-col">
            <!-- Sidebar Header -->
            <div class="p-4 border-b border-gray-700">
                <h2 class="text-lg font-semibold">Conversations</h2>
                <div class="mt-2 flex space-x-2">
                    <button id="create-conversation-btn" 
                            class="p-2 text-gray-400 hover:text-white transition-colors rounded"
                            title="Create conversation">
                        ➕ Create
                    </button>
                    <button id="join-invite-btn" 
                            class="p-2 text-gray-400 hover:text-white transition-colors rounded"
                            title="Join by invite">
                        👥 Join
                    </button>
                    <button id="logout-btn" 
                            class="p-2 text-gray-400 hover:text-red-400 transition-colors rounded ml-auto"
                            title="Logout">
                        🚪 Logout
                    </button>
                </div>
            </div>
            <!-- Conversation List -->
            <div id="conversation-list" class="flex-1 overflow-y-auto p-2">
                <!-- Conversations will be populated here -->
            </div>
        </div>

        <!-- Main Chat Area -->
        <div class="flex-1 flex flex-col">
            <!-- Chat Header -->
            <div class="bg-white shadow-sm p-4 border-b flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <span id="conversation-icon">📢</span>
                    <div>
                        <h1 id="conversation-name" class="text-xl font-bold text-gray-900">General Chat</h1>
                        <p id="conversation-info" class="text-gray-600 text-sm">Public conversation</p>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <button id="change-password-btn" 
                            class="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Change security code">
                        🔐 Security
                    </button>
                    <button id="clear-chat-btn" 
                            class="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Clear chat">
                        🗑️ Clear
                    </button>
                </div>
            </div>

            <div class="flex-1 flex">
                <!-- Messages Area -->
                <div class="flex-1 flex flex-col">
                    <!-- Messages -->
                    <div id="messages" class="flex-1 overflow-y-auto p-4 space-y-2">
                        <div class="text-center text-gray-500 mt-8">
                            <div class="text-4xl mb-4">💬</div>
                            <p class="text-lg font-medium">No messages yet</p>
                            <p class="text-sm">Be the first to start the conversation!</p>
                        </div>
                    </div>

                    <!-- Message Input -->
                    <div class="border-t bg-white p-4">
                        <div class="flex items-center space-x-2">
                            <input type="text" id="message-input" 
                                   class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                   placeholder="Type your message..." maxlength="500">
                            <button id="emoji-btn" 
                                    class="p-2 text-gray-500 hover:text-gray-700 rounded-lg transition-colors"
                                    title="Add emoji">😊</button>
                            <button id="send-btn" 
                                    class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                                Send
                            </button>
                        </div>
                    </div>
                </div>

                <!-- User List -->
                <div class="w-64 border-l bg-white">
                    <div class="p-4 border-b bg-gray-50">
                        <h3 class="font-semibold text-gray-900">👥 Participants</h3>
                    </div>
                    <div id="user-list" class="flex-1 overflow-y-auto p-2">
                        <!-- Users will be populated here -->
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Create Conversation Modal -->
    <div id="create-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style="display: none;">
        <div class="bg-white rounded-lg p-6 w-96">
            <h3 class="text-lg font-semibold mb-4">Create Conversation</h3>
            <div class="space-y-4">
                <input type="text" id="new-conversation-name" 
                       class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                       placeholder="Conversation name">
                <div class="space-y-2">
                    <label class="block text-sm font-medium">Type</label>
                    <div class="space-x-4">
                        <label class="inline-flex items-center">
                            <input type="radio" name="conversation-type" value="public" checked class="mr-2">
                            📢 Public
                        </label>
                        <label class="inline-flex items-center">
                            <input type="radio" name="conversation-type" value="private" class="mr-2">
                            🔒 Private
                        </label>
                    </div>
                </div>
            </div>
            <div class="flex space-x-2 mt-6">
                <button id="create-conversation-confirm" 
                        class="flex-1 bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors">
                    Create
                </button>
                <button id="create-conversation-cancel" 
                        class="flex-1 bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400 transition-colors">
                    Cancel
                </button>
            </div>
        </div>
    </div>

    <!-- Join by Invite Modal -->
    <div id="join-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style="display: none;">
        <div class="bg-white rounded-lg p-6 w-96">
            <h3 class="text-lg font-semibold mb-4">Join Conversation</h3>
            <input type="text" id="invite-code-input" 
                   class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                   placeholder="Enter invite code">
            <div class="flex space-x-2 mt-6">
                <button id="join-invite-confirm" 
                        class="flex-1 bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors">
                    Join
                </button>
                <button id="join-invite-cancel" 
                        class="flex-1 bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400 transition-colors">
                    Cancel
                </button>
            </div>
        </div>
    </div>

    <!-- Private Message Modal -->
    <div id="private-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style="display: none;">
        <div class="bg-white rounded-lg p-6 w-96">
            <h3 class="text-lg font-semibold mb-4">Private Message</h3>
            <p id="private-recipient" class="text-gray-600 mb-4"></p>
            <textarea id="private-message-input" 
                      class="w-full h-24 p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Type your private message..."></textarea>
            <div class="flex space-x-2 mt-6">
                <button id="send-private-confirm" 
                        class="flex-1 bg-purple-600 text-white p-2 rounded hover:bg-purple-700 transition-colors">
                    Send Private Message
                </button>
                <button id="send-private-cancel" 
                        class="flex-1 bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400 transition-colors">
                    Cancel
                </button>
            </div>
        </div>
    </div>

    <!-- Change Password Modal -->
    <div id="change-password-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style="display: none;">
        <div class="bg-white rounded-lg p-6 w-96">
            <h3 class="text-lg font-semibold mb-4">Change Security Code</h3>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Current Security Code</label>
                    <input type="password" id="current-password" 
                           class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                           placeholder="Enter current security code">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">New Security Code</label>
                    <input type="password" id="new-password" 
                           class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                           placeholder="Enter new security code">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Confirm New Security Code</label>
                    <input type="password" id="confirm-password" 
                           class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                           placeholder="Confirm new security code">
                </div>
            </div>
            <div class="flex space-x-2 mt-6">
                <button id="change-password-confirm" 
                        class="flex-1 bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors">
                    Change Security Code
                </button>
                <button id="change-password-cancel" 
                        class="flex-1 bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400 transition-colors">
                    Cancel
                </button>
            </div>
        </div>
    </div>

    <script>
        // Global variables
        let socket;
        let currentUser = null;
        let currentConversation = null;
        let conversations = [];
        let users = [];
        let privateRecipient = null;

        // Initialize the application
        function init() {
            setupEventListeners();
            checkUrlParams();
        }

        function checkUrlParams() {
            const urlParams = new URLSearchParams(window.location.search);
            const inviteCode = urlParams.get('invite');
            if (inviteCode) {
                document.getElementById('invite-code-input').value = inviteCode;
            }
        }

        function setupEventListeners() {
            // Login form
            document.getElementById('login-form').addEventListener('submit', handleLogin);
            
            // Chat functionality
            document.getElementById('send-btn').addEventListener('click', sendMessage);
            document.getElementById('message-input').addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
            
            // Conversation management
            document.getElementById('create-conversation-btn').addEventListener('click', () => {
                document.getElementById('create-modal').style.display = 'flex';
            });
            
            document.getElementById('join-invite-btn').addEventListener('click', () => {
                document.getElementById('join-modal').style.display = 'flex';
            });
            
            document.getElementById('logout-btn').addEventListener('click', logout);
            document.getElementById('clear-chat-btn').addEventListener('click', clearChat);
            document.getElementById('change-password-btn').addEventListener('click', () => {
                document.getElementById('change-password-modal').style.display = 'flex';
            });
            
            // Modal handlers
            setupModalHandlers();
        }

        function setupModalHandlers() {
            // Create conversation modal
            document.getElementById('create-conversation-confirm').addEventListener('click', createConversation);
            document.getElementById('create-conversation-cancel').addEventListener('click', () => {
                document.getElementById('create-modal').style.display = 'none';
            });
            
            // Join invite modal
            document.getElementById('join-invite-confirm').addEventListener('click', joinByInvite);
            document.getElementById('join-invite-cancel').addEventListener('click', () => {
                document.getElementById('join-modal').style.display = 'none';
            });
            
            // Private message modal
            document.getElementById('send-private-confirm').addEventListener('click', sendPrivateMessage);
            document.getElementById('send-private-cancel').addEventListener('click', () => {
                document.getElementById('private-modal').style.display = 'none';
            });
            
            // Change password modal
            document.getElementById('change-password-confirm').addEventListener('click', changePassword);
            document.getElementById('change-password-cancel').addEventListener('click', () => {
                document.getElementById('change-password-modal').style.display = 'none';
                clearPasswordFields();
            });
        }

        function handleLogin(e) {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const isNewUser = document.getElementById('is-new-user').checked;
            
            if (!username) {
                alert('Username is required');
                return;
            }
            
            if (username.length < 2) {
                alert('Username must be at least 2 characters');
                return;
            }
            
            if (!password) {
                alert('Security code is required');
                return;
            }
            
            if (password.length < 4) {
                alert('Security code must be at least 4 characters');
                return;
            }
            
            // Create user object
            currentUser = {
                id: generateUserId(),
                username,
                email: email || undefined,
                joinedAt: new Date(),
                isOnline: true
            };
            
            // Send authentication request to server
            const authData = {
                username,
                password,
                isNewUser,
                user: currentUser
            };
            
            // Initialize socket connection first
            initSocket();
            
            // Send authentication after socket is connected
            socket.on('connect', () => {
                socket.emit('user:authenticate', authData);
            });
        }

        function generateUserId() {
            return 'user_' + Math.random().toString(36).substr(2, 9);
        }

        function initSocket() {
            socket = io();
            
            socket.on('connect', () => {
                console.log('Connected to server');
            });
            
            socket.on('auth:success', (data) => {
                // Authentication successful, proceed to chat
                document.getElementById('login-section').style.display = 'none';
                document.getElementById('chat-section').style.display = 'flex';
                
                // Join default conversation or invite
                const urlParams = new URLSearchParams(window.location.search);
                const inviteCode = urlParams.get('invite');
                
                if (inviteCode) {
                    joinByInviteCode(inviteCode);
                } else {
                    joinConversation('public');
                }
            });
            
            socket.on('auth:failed', (data) => {
                alert('Authentication failed: ' + data.message);
            });
            
            socket.on('password:changed', (data) => {
                alert('Security code changed successfully!');
                document.getElementById('change-password-modal').style.display = 'none';
                clearPasswordFields();
            });
            
            socket.on('password:change-failed', (data) => {
                alert('Failed to change security code: ' + data.message);
            });
            
            socket.on('conversation:history', (data) => {
                currentConversation = data.conversation;
                updateConversationHeader();
                displayMessages(data.messages);
            });
            
            socket.on('message:new', (message) => {
                displayMessage(message);
            });
            
            socket.on('message:private:new', (privateMessage) => {
                displayPrivateMessage(privateMessage);
            });
            
            socket.on('conversation:participants', (participants) => {
                users = participants;
                updateUserList();
            });
            
            socket.on('conversations:list', (convList) => {
                conversations = convList;
                updateConversationList();
            });
            
            socket.on('conversation:cleared', () => {
                document.getElementById('messages').innerHTML = '<div class="text-center text-gray-500 mt-8"><div class="text-4xl mb-4">💬</div><p class="text-lg font-medium">Chat cleared</p></div>';
            });
            
            socket.on('conversation:created', (conversation) => {
                conversations.push(conversation);
                updateConversationList();
                if (conversation.inviteCode) {
                    const inviteLink = window.location.origin + '?invite=' + conversation.inviteCode;
                    prompt('Conversation created! Share this invite link:', inviteLink);
                }
            });
            
            socket.on('error', (error) => {
                alert('Error: ' + error.message);
            });
        }

        function joinConversation(conversationId) {
            socket.emit('conversation:join', { conversationId, user: currentUser });
            socket.emit('conversations:list');
        }

        function createConversation() {
            const name = document.getElementById('new-conversation-name').value.trim();
            const type = document.querySelector('input[name="conversation-type"]:checked').value;
            
            if (!name) {
                alert('Conversation name is required');
                return;
            }
            
            socket.emit('conversation:create', { name, type });
            document.getElementById('create-modal').style.display = 'none';
            document.getElementById('new-conversation-name').value = '';
        }

        function joinByInvite() {
            const inviteCode = document.getElementById('invite-code-input').value.trim();
            if (!inviteCode) {
                alert('Invite code is required');
                return;
            }
            
            joinByInviteCode(inviteCode);
            document.getElementById('join-modal').style.display = 'none';
        }

        function joinByInviteCode(inviteCode) {
            socket.emit('conversation:join-by-invite', { inviteCode, user: currentUser });
        }

        function sendMessage() {
            const input = document.getElementById('message-input');
            const content = input.value.trim();
            
            if (!content || !currentConversation) return;
            
            socket.emit('message:send', {
                conversationId: currentConversation.id,
                content,
                type: 'text'
            });
            
            input.value = '';
        }

        function sendPrivateMessage() {
            const content = document.getElementById('private-message-input').value.trim();
            if (!content || !privateRecipient) return;
            
            socket.emit('message:private', {
                recipientId: privateRecipient.id,
                content
            });
            
            document.getElementById('private-modal').style.display = 'none';
            document.getElementById('private-message-input').value = '';
        }

        function clearChat() {
            if (!confirm('Are you sure you want to clear the chat? This action cannot be undone.')) return;
            
            socket.emit('conversation:clear', { conversationId: currentConversation.id });
        }

        function changePassword() {
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            if (!currentPassword || !newPassword || !confirmPassword) {
                alert('All fields are required');
                return;
            }
            
            if (newPassword.length < 4) {
                alert('New security code must be at least 4 characters');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                alert('New security codes do not match');
                return;
            }
            
            socket.emit('user:change-password', {
                currentPassword,
                newPassword
            });
        }
        
        function clearPasswordFields() {
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
        }

        function logout() {
            if (!confirm('Are you sure you want to logout?')) return;
            
            socket.emit('user:logout');
            socket.disconnect();
            location.reload();
        }

        function displayMessages(messages) {
            const container = document.getElementById('messages');
            container.innerHTML = '';
            
            messages.forEach(message => displayMessage(message));
        }

        function displayMessage(message) {
            const container = document.getElementById('messages');
            const messageEl = document.createElement('div');
            const isOwn = message.userId === currentUser.id;
            const isSystem = message.type === 'system';
            const isPrivate = message.type === 'private';
            
            let messageClass = 'flex mb-4 ';
            messageClass += isOwn ? 'justify-end' : 'justify-start';
            
            let bubbleClass = 'max-w-xs lg:max-w-md px-4 py-2 rounded-lg ';
            if (isSystem) {
                bubbleClass += 'message-system';
            } else if (isPrivate) {
                bubbleClass += 'message-private';
            } else {
                bubbleClass += isOwn ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900';
            }
            
            const timestamp = new Date(message.timestamp).toLocaleTimeString();
            
            messageEl.className = messageClass;
            messageEl.innerHTML = 
                '<div class="' + bubbleClass + '">' +
                    (!isOwn && !isSystem ? 
                        '<div class="flex items-center justify-between text-xs font-medium mb-1 opacity-75">' +
                            '<span>' + message.username + '</span>' +
                            '<button onclick="openPrivateMessage(&quot;' + message.userId + '&quot;, &quot;' + message.username.replace(/"/g, '&quot;') + '&quot;)" ' +
                                    'class="ml-2 text-xs hover:bg-black hover:bg-opacity-10 rounded px-1" ' +
                                    'title="Send private message">💬</button>' +
                        '</div>'
                    : '') +
                    (isPrivate ? '<div class="text-xs opacity-75 mb-1">Private message</div>' : '') +
                    '<div class="' + (message.type === 'emoji' ? 'text-2xl' : 'text-sm') + '">' + message.content + '</div>' +
                    '<div class="text-xs mt-1 opacity-75">' + timestamp + '</div>' +
                '</div>';
            
            container.appendChild(messageEl);
            container.scrollTop = container.scrollHeight;
        }

        function displayPrivateMessage(privateMessage) {
            // Display private messages in a special way
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 bg-purple-100 border border-purple-400 text-purple-700 px-4 py-2 rounded z-50';
            notification.innerHTML = 'Private message from ' + privateMessage.senderId + ': ' + privateMessage.content;
            
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 5000);
        }

        function openPrivateMessage(userId, username) {
            if (userId === currentUser.id) return;
            
            privateRecipient = { id: userId, username };
            document.getElementById('private-recipient').textContent = 'Send private message to ' + username;
            document.getElementById('private-modal').style.display = 'flex';
        }

        function updateConversationHeader() {
            if (!currentConversation) return;
            
            document.getElementById('conversation-name').textContent = currentConversation.name;
            document.getElementById('conversation-icon').textContent = currentConversation.type === 'public' ? '📢' : '🔒';
            document.getElementById('conversation-info').textContent = 
                currentConversation.type === 'private' ? 
                'Private conversation • Invite: ' + (currentConversation.inviteCode || 'N/A') : 
                'Public conversation';
        }

        function updateConversationList() {
            const container = document.getElementById('conversation-list');
            container.innerHTML = '';
            
            conversations.forEach(conv => {
                const convEl = document.createElement('div');
                const isActive = currentConversation && conv.id === currentConversation.id;
                
                convEl.className = 'p-3 mb-2 rounded cursor-pointer transition-colors ' + (isActive ? 'conversation-active' : 'hover:bg-gray-800');
                convEl.innerHTML = 
                    '<div class="flex items-center space-x-2">' +
                        '<span>' + (conv.type === 'public' ? '📢' : '🔒') + '</span>' +
                        '<span class="font-medium truncate">' + conv.name + '</span>' +
                        (conv.inviteCode ? '<button onclick="copyInviteLink(&quot;' + conv.inviteCode + '&quot;)" class="ml-auto text-xs hover:bg-white hover:bg-opacity-20 rounded px-1" title="Copy invite">📋</button>' : '') +
                    '</div>' +
                    '<div class="text-xs opacity-75 mt-1">' + conv.participants.length + ' participants</div>';
                
                convEl.addEventListener('click', () => {
                    if (conv.id !== currentConversation?.id) {
                        joinConversation(conv.id);
                    }
                });
                
                container.appendChild(convEl);
            });
        }

        function updateUserList() {
            const container = document.getElementById('user-list');
            container.innerHTML = '';
            
            users.forEach(user => {
                const userEl = document.createElement('div');
                const isCurrentUser = user.id === currentUser.id;
                
                userEl.className = 'p-2 mb-2 rounded transition-colors ' + (isCurrentUser ? 'bg-indigo-50 border border-indigo-200' : 'bg-gray-50 hover:bg-gray-100');
                userEl.innerHTML = 
                    '<div class="flex items-center justify-between">' +
                        '<div class="flex-1">' +
                            '<div class="flex items-center">' +
                                '<span class="' + (user.isOnline ? 'user-online' : 'user-offline') + '"></span>' +
                                '<span class="font-medium text-sm">' + user.username + (isCurrentUser ? ' (You)' : '') + '</span>' +
                            '</div>' +
                            (user.location ? '<div class="text-xs text-gray-500 mt-1">📍 ' + user.location + '</div>' : '') +
                        '</div>' +
                        (!isCurrentUser ? '<button onclick="openPrivateMessage(&quot;' + user.id + '&quot;, &quot;' + user.username.replace(/"/g, '&quot;') + '&quot;)" class="text-xs text-purple-600 hover:bg-purple-50 rounded px-2 py-1" title="Private message">💬</button>' : '') +
                    '</div>';
                
                container.appendChild(userEl);
            });
        }

        function copyInviteLink(inviteCode) {
            const inviteLink = window.location.origin + '?invite=' + inviteCode;
            navigator.clipboard.writeText(inviteLink).then(() => {
                alert('Invite link copied to clipboard!');
            });
        }

        // Initialize the application
        document.addEventListener('DOMContentLoaded', init);
    </script>
</body>
</html>
    `);
});

// Create HTTP server and Socket.io
const server = createServer(app);

// Socket.io configuration optimized for serverless environments like Vercel
const io = new Server(server, {
    cors: {
        origin: process.env.SOCKET_IO_CORS_ORIGIN || 
                (process.env.NODE_ENV === 'production' 
                    ? ["https://*.vercel.app"] 
                    : "*"),
        methods: ["GET", "POST"],
        credentials: true
    },
    // Configure transport methods for better Vercel compatibility
    transports: ['polling', 'websocket'],
    // Force polling first, then upgrade to websocket if available
    upgrade: true,
    // Increase timeout for serverless environments
    pingTimeout: 60000,
    pingInterval: 25000,
    // Additional configuration for production
    allowEIO3: true,
    cookie: process.env.NODE_ENV === 'production' ? {
        name: "io",
        httpOnly: true,
        sameSite: "strict",
        secure: true
    } : false
});

// Helper function to safely emit to rooms and notify long-polling clients
const safeEmit = (room, event, data) => {
    // Emit via Socket.io if available
    if (io) {
        io.to(room).emit(event, data);
    }
    
    // Notify long-polling clients for message events
    if (event === 'message:new' && global.pollingClients) {
        for (const [clientId, client] of global.pollingClients.entries()) {
            if (client.conversationId === room) {
                try {
                    client.res.json({ 
                        messages: [data], 
                        timestamp: new Date().toISOString() 
                    });
                    global.pollingClients.delete(clientId);
                } catch (error) {
                    // Client likely disconnected
                    global.pollingClients.delete(clientId);
                }
            }
        }
    }
};

const safeEmitToSocket = (socketId, event, data) => {
    if (io) {
        io.to(socketId).emit(event, data);
    }
};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // User authentication
    socket.on('user:authenticate', (data) => {
        const { username, password, isNewUser, user } = data;
        
        if (isNewUser) {
            // Register new user
            if (userCredentials.has(username)) {
                socket.emit('auth:failed', { message: 'Username already exists. Please choose a different username or uncheck "I\'m a new user".' });
                return;
            }
            
            const salt = generateSalt();
            const hashedPassword = hashPassword(password, salt);
            userCredentials.set(username, { hashedPassword, salt });
            
            console.log('New user registered:', username);
            socket.emit('auth:success', { message: 'Account created successfully!' });
        } else {
            // Login existing user
            const credentials = userCredentials.get(username);
            if (!credentials) {
                socket.emit('auth:failed', { message: 'Username not found. Please check "I\'m a new user" if this is your first time.' });
                return;
            }
            
            if (!verifyPassword(password, credentials.hashedPassword, credentials.salt)) {
                socket.emit('auth:failed', { message: 'Incorrect security code.' });
                return;
            }
            
            console.log('User authenticated:', username);
            socket.emit('auth:success', { message: 'Login successful!' });
        }
        
        // Store authenticated user
        user.username = username; // Ensure username matches
        user.isAuthenticated = true;
        connectedUsers.set(socket.id, user);
        userSockets.set(user.id, socket.id);
    });

    // Change password
    socket.on('user:change-password', (data) => {
        const user = connectedUsers.get(socket.id);
        if (!user) {
            socket.emit('password:change-failed', { message: 'User not authenticated' });
            return;
        }

        const { currentPassword, newPassword } = data;
        const credentials = userCredentials.get(user.username);
        
        if (!credentials) {
            socket.emit('password:change-failed', { message: 'User credentials not found' });
            return;
        }
        
        if (!verifyPassword(currentPassword, credentials.hashedPassword, credentials.salt)) {
            socket.emit('password:change-failed', { message: 'Current security code is incorrect' });
            return;
        }
        
        // Update password
        const newSalt = generateSalt();
        const newHashedPassword = hashPassword(newPassword, newSalt);
        userCredentials.set(user.username, { hashedPassword: newHashedPassword, salt: newSalt });
        
        console.log('Password changed for user:', user.username);
        socket.emit('password:changed', { message: 'Security code updated successfully' });
    });

    // Join conversation
    socket.on('conversation:join', (data) => {
        const { conversationId, user } = data;
        const authenticatedUser = connectedUsers.get(socket.id);
        
        if (!authenticatedUser || !authenticatedUser.isAuthenticated) {
            socket.emit('error', { message: 'Please authenticate first' });
            return;
        }
        
        const conversation = conversations.get(conversationId);
        
        if (!conversation) {
            socket.emit('error', { message: 'Conversation not found' });
            return;
        }

        // Use the authenticated user instead of the passed user
        const currentUser = authenticatedUser;
        
        // Store user and socket mapping (update existing)
        currentUser.isOnline = true;
        connectedUsers.set(socket.id, currentUser);
        userSockets.set(currentUser.id, socket.id);
        
        // Join socket room
        socket.join(conversationId);
        
        // Add user to conversation participants
        if (!conversation.participants.includes(currentUser.id)) {
            conversation.participants.push(currentUser.id);
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
        const joinMessage = {
            id: uuidv4(),
            userId: 'system',
            username: 'System',
            content: currentUser.username + ' joined the conversation',
            type: 'system',
            timestamp: new Date(),
            conversationId,
        };
        
        messages.push(joinMessage);
        safeEmit(conversationId, 'message:new', joinMessage);
        
        console.log('User ' + currentUser.username + ' joined conversation ' + conversationId);
    });

    // Send message to conversation
    socket.on('message:send', (data) => {
        const user = connectedUsers.get(socket.id);
        if (!user) return;

        const { conversationId, content, type = 'text' } = data;
        const messages = conversationMessages.get(conversationId);
        if (!messages) return;

        const message = {
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
        console.log('Message sent in ' + conversationId + ':', message.content);
    });

    // Send private message
    socket.on('message:private', (data) => {
        const sender = connectedUsers.get(socket.id);
        if (!sender) return;

        const { recipientId, content } = data;
        const recipientSocketId = userSockets.get(recipientId);
        
        const privateMessage = {
            id: uuidv4(),
            senderId: sender.id,
            recipientId,
            content,
            timestamp: new Date(),
            conversationId: 'private_' + [sender.id, recipientId].sort().join('_'),
            isRead: false,
        };

        // Store private message
        const key = privateMessage.conversationId;
        if (!privateMessages.has(key)) {
            privateMessages.set(key, []);
        }
        privateMessages.get(key).push(privateMessage);

        // Send to both sender and recipient
        socket.emit('message:private:new', privateMessage);
        if (recipientSocketId) {
            safeEmitToSocket(recipientSocketId, 'message:private:new', privateMessage);
        }

        console.log('Private message from ' + sender.username + ' to ' + recipientId);
    });

    // Create new conversation
    socket.on('conversation:create', (data) => {
        const user = connectedUsers.get(socket.id);
        if (!user) return;

        const conversation = {
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
        console.log('Conversation created: ' + conversation.name + ' by ' + user.username);
    });

    // Join conversation by invite code
    socket.on('conversation:join-by-invite', (data) => {
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
    socket.on('conversation:clear', (data) => {
        const user = connectedUsers.get(socket.id);
        if (!user) return;

        const conversation = conversations.get(data.conversationId);
        if (!conversation) return;

        // For private conversations, only creator can clear. For public conversations, anyone can clear.
        if (conversation.type === 'private' && conversation.createdBy !== user.id && user.id !== 'system') {
            socket.emit('error', { message: 'Permission denied' });
            return;
        }

        conversationMessages.set(data.conversationId, []);
        
        const clearMessage = {
            id: uuidv4(),
            userId: 'system',
            username: 'System',
            content: 'Chat cleared by ' + user.username,
            type: 'system',
            timestamp: new Date(),
            conversationId: data.conversationId,
        };

        conversationMessages.get(data.conversationId).push(clearMessage);
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
                const leaveMessage = {
                    id: uuidv4(),
                    userId: 'system',
                    username: 'System',
                    content: user.username + ' left the conversation',
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
        console.log('User ' + user.username + ' logged out');
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

server.listen(port, () => {
    console.log('🚀 Project Messenger server running on port ' + port);
    console.log('📱 Open your browser and go to: http://localhost:' + port);
    console.log('🌐 Socket.io ready for real-time messaging');
});
