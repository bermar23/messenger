# Project Messenger

A real-time web-based messaging application built with Next.js, TypeScript, and Socket.io.

## Features

- **Simple Authentication**: Join with just a username or email
- **Real-time Messaging**: Instant communication using Socket.io
- **IP Address & Location Detection**: Automatically detects user location
- **Message Formatting**: Support for text messages and emoticons
- **Local Network Compatible**: Works seamlessly on local networks
- **Vercel Deployable**: Optimized for easy deployment on Vercel
- **Responsive Design**: Beautiful UI that works on all devices

## Technology Stack

- **Frontend**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS
- **Real-time Communication**: Socket.io
- **State Management**: React Context & Hooks
- **Icons**: Lucide React
- **Emojis**: Emoji Picker React

## Getting Started

### Prerequisites

- Node.js 18.18.0 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd project-messenger
```

2. Install dependencies:
```bash
npm install
```

3. Start the development servers:
```bash
npm run dev:full
```

This will start both the Next.js frontend (port 3000) and Socket.io server (port 3001).

### Individual Commands

- **Frontend only**: `npm run dev`
- **Socket.io server only**: `npm run server`
- **Build for production**: `npm run build`
- **Start production**: `npm start`

## Usage

1. Open your browser and go to `http://localhost:3000`
2. Enter a username (email is optional)
3. Start chatting in real-time!

## Local Network Access

To use on your local network:

1. Find your local IP address
2. Access the app at `http://[YOUR_IP]:3000`
3. Update the `NEXT_PUBLIC_SOCKET_URL` in `.env.local` to include your IP

## Environment Variables

Create a `.env.local` file in the root directory:

```env
# Socket.io server URL (leave empty for same origin in production)
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001

# Socket.io server port
SOCKET_PORT=3001
```

## Deployment

### Vercel Deployment

1. Push your code to a Git repository
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

For the Socket.io server, you may need to deploy it separately on a service like Railway, Render, or Heroku.

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # React components
├── context/            # React Context providers
├── lib/                # Utility functions and configurations
└── types/              # TypeScript type definitions
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Version

**Current Version**: 1.0.0

---

Built with ❤️ using Next.js and Socket.io
