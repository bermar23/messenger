# Project Messenger Development Setup

## Quick Start

For the simplest setup that works with your current Node.js version:

### Option 1: Separate Servers (Recommended for Development)

1. **Start the Socket.io server** (Terminal 1):
```bash
npm run server
```

2. **Start the Next.js frontend** (Terminal 2):
```bash
npm run dev
```

3. **Open your browser** and go to: `http://localhost:3000`

### Option 2: Concurrent Mode

Start both servers with one command:
```bash
npm run dev:full
```

### Option 3: Simple All-in-One (If Next.js has issues)

If you encounter Node.js version issues with Next.js:
```bash
npm run standalone
```

This runs a simple Express server with Socket.io on port 3000.

## Testing the App

1. Open multiple browser tabs to `http://localhost:3000`
2. Enter different usernames in each tab
3. Start chatting to see real-time messaging
4. Click on emoji button to send emoticons
5. Notice the user list on the right showing online users

## Local Network Testing

1. Find your IP address: `ifconfig` (Mac/Linux) or `ipconfig` (Windows)
2. Update `.env.local` if needed:
   ```
   NEXT_PUBLIC_SOCKET_URL=http://[YOUR_IP]:3001
   ```
3. Access from other devices: `http://[YOUR_IP]:3000`

## Features to Test

- ✅ Real-time messaging
- ✅ User join/leave notifications
- ✅ Emoji picker
- ✅ IP address detection
- ✅ Location detection (if not localhost)
- ✅ Responsive design
- ✅ Connection status indicator

## Troubleshooting

- **Can't connect**: Make sure both servers are running
- **Messages not sending**: Check browser console for Socket.io errors
- **Node.js version warning**: The app should still work for development
- **Port conflicts**: Change ports in `.env.local` if needed

## Production Deployment

For production deployment on Vercel:
1. Deploy the Next.js app to Vercel
2. Deploy the Socket.io server separately (Railway, Render, etc.)
3. Update environment variables accordingly
