'use client';

import { ChatProvider, useChat } from '@/context/ChatContext';
import { LoginForm } from '@/components/LoginForm';
import { ChatRoom } from '@/components/ChatRoom';
import { useSearchParams } from 'next/navigation';

function AppContent() {
  const { currentUser, currentConversation } = useChat();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get('invite');

  if (!currentUser || !currentConversation) {
    return <LoginForm inviteCode={inviteCode || undefined} />;
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
