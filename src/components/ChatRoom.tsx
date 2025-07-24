'use client';

import React, { useEffect, useRef } from 'react';
import { useChat } from '@/context/ChatContext';
import { Message } from './Message';
import { MessageInput } from './MessageInput';
import { UserList } from './UserList';
import { LogOut, MessageCircle } from 'lucide-react';

export function ChatRoom() {
  const { messages, currentUser, leaveChat, isConnected } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleLeave = () => {
    if (window.confirm('Are you sure you want to leave the chat?')) {
      leaveChat();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <MessageCircle className="text-indigo-600" size={24} />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Project Messenger</h1>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>Welcome, {currentUser?.username}</span>
              {currentUser?.location && (
                <>
                  <span>•</span>
                  <span>{currentUser.location}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <button
          onClick={handleLeave}
          className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <LogOut size={18} />
          <span>Leave</span>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No messages yet</p>
                <p className="text-sm">Be the first to start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                  isOwn={message.userId === currentUser?.id}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Message Input */}
          <MessageInput />
        </div>
        
        {/* User List */}
        <UserList />
      </div>
    </div>
  );
}
