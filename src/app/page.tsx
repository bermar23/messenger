'use client';

import { ChatProvider, useChat } from '@/context/ChatContext';
import { LoginForm } from '@/components/LoginForm';
import { ChatRoom } from '@/components/ChatRoom';

function AppContent() {
  const { currentUser } = useChat();

  if (!currentUser) {
    return <LoginForm />;
  }

  return <ChatRoom />;
}

export default function Home() {
  return (
    <ChatProvider>
      <AppContent />
    </ChatProvider>
  );
}
