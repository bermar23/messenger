#!/bin/bash

# Quick Vercel Deployment (Skip Local Testing)
# Use this if the main deploy-vercel.sh has issues with local testing

echo "🚀 Quick Deploy to Vercel (skipping local tests)..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Install it with: npm i -g vercel"
    exit 1
fi

# Ensure dependencies are installed
echo "📦 Installing dependencies..."
npm install express socket.io uuid

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
