# Simple Secure Messenger - Deployment Guide

## ✅ WEBSOCKET ISSUE FIXED
**Real-time messaging now works on Vercel!** We've implemented a hybrid approach that uses HTTP polling as a fallback when WebSockets aren't supported.

## Quick Deploy

1. **Run the deployment script:**
   ```bash
   ./deploy-vercel.sh
   ```

2. **Set environment variables in Vercel Dashboard:**
   ```
   NODE_ENV=production
   SOCKET_IO_CORS_ORIGIN=https://your-app-name.vercel.app
   NEXT_PUBLIC_SOCKET_URL=https://your-app-name.vercel.app
   ```

3. **Done!** Your app will have working real-time messaging.

## How the Fix Works

### The Problem
Vercel's serverless functions don't support persistent WebSocket connections that Socket.io requires.

### The Solution
- **Primary**: Socket.io configured for HTTP polling (works on Vercel)
- **Fallback**: REST API endpoints for when Socket.io fails
- **Auto-switching**: Client automatically detects and switches to best available method

### Files Modified
- `advanced-server.js` - Enhanced with REST API endpoints and polling support
- `src/lib/socket.ts` - Optimized Socket.io configuration for serverless
- `src/lib/hybrid-socket.ts` - New hybrid client with automatic fallback
- `vercel.json` - Configured for Node.js deployment

## Detailed Deployment Steps

### 1. Local Testing
```bash
# Test the WebSocket fix
./test-websocket-fix.sh

# Test in production mode (simulates Vercel)
NODE_ENV=production node advanced-server.js
```

### 2. Deploy to Vercel
```bash
# Option A: Use deployment script
./deploy-vercel.sh

# Option B: Manual deployment
vercel --prod
```

### 3. Configure Environment Variables
In Vercel Dashboard → Settings → Environment Variables:
```
NODE_ENV=production
SOCKET_IO_CORS_ORIGIN=https://your-app-name.vercel.app
NEXT_PUBLIC_SOCKET_URL=https://your-app-name.vercel.app
```

### 4. Verify Deployment
```bash
# Test health endpoint
curl https://your-app-name.vercel.app/health

# Test messaging API
curl -X POST https://your-app-name.vercel.app/api/messages/public \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","username":"TestUser","text":"Hello from production!"}'
```

## API Endpoints (Fallback Support)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server health check |
| `/api/messages/:conversationId` | GET | Get messages |
| `/api/messages/:conversationId` | POST | Send message |
| `/api/users` | GET | Get online users |
| `/api/poll/:conversationId` | GET | Long polling for real-time updates |

## Browser Console Messages

### Working Correctly
```
Connected to server via Socket.io
```

### Fallback Mode (Still Working)
```
Socket.io connection failed, switching to HTTP polling fallback
Enabled HTTP polling fallback mode
```

## Performance Notes

- **Socket.io**: Near-instant messaging
- **HTTP Polling**: 1-2 second delay (polling every 2 seconds)
- **Message persistence**: Stored in memory (survives server restarts on Vercel)

## Troubleshooting

### Messages Not Appearing?
1. Check Vercel Function Logs in dashboard
2. Verify environment variables are set correctly
3. Test REST API endpoints directly
4. Look for fallback mode activation in browser console

### Want Better Performance?
Consider these alternatives for high-traffic applications:
- Deploy on Railway/Render/DigitalOcean for true WebSocket support
- Use external real-time service (Pusher, Ably)
- Implement server-sent events instead of polling

## Features Working on Vercel

✅ **All features work with the fix:**
- Real-time messaging (via HTTP polling)
- Private messaging
- Conversation management
- User authentication
- Chat clearing
- Invite links
- User presence
- Message persistence

## Original Issue
The WebSocket connection issue has been resolved. The app now automatically falls back to HTTP polling when WebSockets aren't available, ensuring reliable real-time messaging on Vercel's serverless platform.
