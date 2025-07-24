#!/bin/bash

# Project Messenger Start Script
echo "🚀 Starting Project Messenger..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18.18.0 or higher."
    exit 1
fi

# Display Node.js version
NODE_VERSION=$(node -v)
echo "📟 Node.js version: $NODE_VERSION"

# Start Socket.io server in background
echo "🔌 Starting Socket.io server on port 3001..."
node server.js &
SERVER_PID=$!

# Wait a moment for server to start
sleep 2

# Start Next.js development server
echo "🌐 Starting Next.js frontend on port 3000..."
echo "⚠️  Note: If you see Node.js version warnings, the app should still work for development."
echo ""
echo "📱 Open your browser and go to: http://localhost:3000"
echo "🌐 For local network access, use: http://[YOUR_IP]:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $SERVER_PID 2>/dev/null
    exit 0
}

# Trap Ctrl+C
trap cleanup INT

# Start Next.js (this will keep running)
npx next dev --turbopack

# If Next.js exits, cleanup
cleanup
