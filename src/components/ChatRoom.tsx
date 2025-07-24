'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useChat } from '@/context/ChatContext';
import { Message } from './Message';
import { MessageInput } from './MessageInput';
import { UserList } from './UserList';
import { ConversationSelector } from './ConversationSelector';
import { PrivateMessageModal } from './PrivateMessageModal';
import { Trash2, MessageCircle, Users, Hash, Lock } from 'lucide-react';

export function ChatRoom() {
  const { messages, currentUser, currentConversation, clearConversation } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showPrivateModal, setShowPrivateModal] = useState(false);
  const [privateRecipient, setPrivateRecipient] = useState<{ id: string; username: string } | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handlePrivateMessage = (userId: string, username: string) => {
    setPrivateRecipient({ id: userId, username });
    setShowPrivateModal(true);
  };

  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear the chat? This action cannot be undone.')) {
      clearConversation();
    }
  };

  if (!currentUser || !currentConversation) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Conversation Selector */}
      <ConversationSelector />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white shadow-sm p-4 border-b flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {currentConversation.type === 'public' ? (
              <Hash className="text-gray-500" size={20} />
            ) : (
              <Lock className="text-gray-500" size={20} />
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{currentConversation.name}</h1>
              <p className="text-gray-600 text-sm">
                {currentConversation.type === 'private' ? 'Private conversation' : 'Public conversation'}
                {currentConversation.inviteCode && ` • Invite code: ${currentConversation.inviteCode}`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleClearChat}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Clear chat"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No messages yet</p>
                    <p className="text-sm">Be the first to send a message!</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <Message
                    key={message.id}
                    message={message}
                    isOwn={message.userId === currentUser.id}
                    onPrivateMessage={handlePrivateMessage}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <MessageInput />
          </div>

          {/* User List */}
          <div className="w-64 border-l bg-white">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center space-x-2">
                <Users size={16} className="text-gray-500" />
                <h3 className="font-semibold text-gray-900">Participants</h3>
              </div>
            </div>
            <UserList onPrivateMessage={handlePrivateMessage} />
          </div>
        </div>
      </div>

      {/* Private Message Modal */}
      {showPrivateModal && privateRecipient && (
        <PrivateMessageModal
          recipientId={privateRecipient.id}
          recipientUsername={privateRecipient.username}
          onClose={() => {
            setShowPrivateModal(false);
            setPrivateRecipient(null);
          }}
        />
      )}
    </div>
  );
}
