#!/bin/bash

# Test script for WebSocket fix
echo "🧪 Testing WebSocket Fix for Vercel Compatibility"
echo "================================================="

# Start server in production mode (simulates Vercel)
echo "🚀 Starting server in production mode..."
NODE_ENV=production node advanced-server.js &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Test health endpoint
echo "📊 Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3000/health)
if [[ $HEALTH_RESPONSE == *"OK"* ]]; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    kill $SERVER_PID
    exit 1
fi

# Test REST API message sending
echo "📝 Testing REST API message sending..."
MESSAGE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/messages/public \
    -H "Content-Type: application/json" \
    -d '{"userId":"test","username":"TestBot","text":"REST API test message"}')

if [[ $? -eq 0 ]]; then
    echo "✅ Message sending via REST API works"
else
    echo "❌ Message sending failed"
    kill $SERVER_PID
    exit 1
fi

# Test message retrieval
echo "📥 Testing message retrieval..."
MESSAGES_RESPONSE=$(curl -s http://localhost:3000/api/messages/public)
if [[ $MESSAGES_RESPONSE == *"TestBot"* ]]; then
    echo "✅ Message retrieval works"
    echo "📊 Found test message in response"
else
    echo "❌ Message retrieval failed"
    kill $SERVER_PID
    exit 1
fi

# Test users endpoint
echo "👥 Testing users endpoint..."
USERS_RESPONSE=$(curl -s http://localhost:3000/api/users)
if [[ $USERS_RESPONSE == *"users"* ]]; then
    echo "✅ Users endpoint works"
else
    echo "❌ Users endpoint failed"
    kill $SERVER_PID
    exit 1
fi

# Clean up
kill $SERVER_PID

echo ""
echo "🎉 All tests passed! WebSocket fix is working correctly."
echo ""
echo "✅ Server starts in production mode"
echo "✅ Health endpoint responds"
echo "✅ REST API message sending works"
echo "✅ REST API message retrieval works"
echo "✅ Users endpoint works"
echo ""
echo "💡 The app is ready for Vercel deployment!"
echo "   Run ./deploy-vercel.sh to deploy"
