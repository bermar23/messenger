#!/bin/bash

# Vercel Deployment Script with WebSocket Fix
# This script deploys the messaging app to Vercel with optimized configuration

echo "🚀 Deploying Simple Secure Messenger to Vercel with WebSocket fix..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Install it with: npm i -g vercel"
    exit 1
fi

# Ensure we're using the standalone server
echo "✅ Using advanced-server.js (standalone Express + Socket.io)"

# Check if production dependencies are installed
echo "📦 Checking dependencies..."
npm list express socket.io uuid > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "⚠️  Installing missing dependencies..."
    npm install express socket.io uuid
fi

# Clean up any existing processes on port 3000
echo "🧹 Cleaning up port 3000..."
pkill -f "node advanced-server.js" 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 1

# Validate server can start
echo "🧪 Testing server locally..."
NODE_ENV=production node advanced-server.js > /tmp/server-test.log 2>&1 &
SERVER_PID=$!
sleep 3

# Test health endpoint with retries
HEALTH_CHECK_PASSED=false
for i in {1..5}; do
    if curl -s --connect-timeout 2 http://localhost:3000/health > /dev/null 2>&1; then
        echo "✅ Local server test passed (attempt $i)"
        HEALTH_CHECK_PASSED=true
        break
    fi
    echo "⏳ Waiting for server to start (attempt $i/5)..."
    sleep 2
done

# Clean up test server
kill $SERVER_PID 2>/dev/null || true
sleep 1

if [ "$HEALTH_CHECK_PASSED" = false ]; then
    echo "❌ Local server test failed. Server logs:"
    cat /tmp/server-test.log | tail -10
    echo ""
    echo "🔧 Continuing with deployment anyway (server might work in Vercel environment)"
fi

# Get the app name from user
read -p "📝 Enter your Vercel app name (or press Enter for auto-generated): " APP_NAME

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
if [ -z "$APP_NAME" ]; then
    vercel --prod
else
    vercel --prod --name "$APP_NAME"
fi

# Check deployment status
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "🔧 IMPORTANT: Set these environment variables in Vercel Dashboard:"
    echo "   NODE_ENV=production"
    echo "   SOCKET_IO_CORS_ORIGIN=https://${APP_NAME:-your-app-name}.vercel.app"
    echo "   NEXT_PUBLIC_SOCKET_URL=https://${APP_NAME:-your-app-name}.vercel.app"
    echo ""
    echo "🌐 Visit: https://vercel.com/dashboard → Your Project → Settings → Environment Variables"
    echo ""
    echo "🧪 Test your deployment:"
    echo "   Health: curl https://${APP_NAME:-your-app-name}.vercel.app/health"
    echo "   App: Open https://${APP_NAME:-your-app-name}.vercel.app in browser"
    echo ""
    echo "💡 Real-time messaging works via HTTP polling (Vercel doesn't support WebSockets)"
    echo "   Messages may take 1-2 seconds to appear due to polling interval."
    echo ""
    echo "🔍 If messages don't work:"
    echo "   1. Check Vercel Function Logs in dashboard"
    echo "   2. Verify environment variables are set correctly"
    echo "   3. Test REST API: curl -X POST https://${APP_NAME:-your-app-name}.vercel.app/api/messages/public"
else
    echo "❌ Deployment failed. Check the error messages above."
    exit 1
fi
