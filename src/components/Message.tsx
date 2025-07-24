'use client';

import React from 'react';
import { Message as MessageType } from '@/types';
import { formatTimestamp } from '@/lib/utils';
import { Lock, MessageCircle } from 'lucide-react';

interface MessageProps {
  message: MessageType;
  isOwn: boolean;
  onPrivateMessage?: (userId: string, username: string) => void;
}

export function Message({ message, isOwn, onPrivateMessage }: MessageProps) {
  const getMessageStyle = () => {
    if (message.type === 'system') {
      return 'bg-yellow-100 text-yellow-800 text-center italic';
    }
    if (message.type === 'private') {
      return isOwn 
        ? 'bg-purple-600 text-white border-l-4 border-purple-800' 
        : 'bg-purple-100 text-purple-900 border-l-4 border-purple-600';
    }
    return isOwn 
      ? 'bg-indigo-600 text-white' 
      : 'bg-gray-100 text-gray-900';
  };

  const handlePrivateMessageClick = () => {
    if (!isOwn && onPrivateMessage && message.type !== 'system') {
      onPrivateMessage(message.userId, message.username);
    }
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${getMessageStyle()}`}>
        {!isOwn && message.type !== 'system' && (
          <div className="flex items-center justify-between text-xs font-medium mb-1 opacity-75">
            <span>{message.username}</span>
            {message.type === 'private' ? (
              <Lock size={12} />
            ) : (
              <button
                onClick={handlePrivateMessageClick}
                className="p-1 hover:bg-black hover:bg-opacity-10 rounded transition-colors"
                title="Send private message"
              >
                <MessageCircle size={12} />
              </button>
            )}
          </div>
        )}
        
        {message.type === 'private' && (
          <div className="text-xs opacity-75 mb-1">
            Private message {isOwn ? 'to' : 'from'} {isOwn ? message.recipientId : message.username}
          </div>
        )}
        
        <div className={`${message.type === 'emoji' ? 'text-2xl' : 'text-sm'}`}>
          {message.content}
        </div>
        
        <div className={`text-xs mt-1 ${
          message.type === 'system' 
            ? 'text-yellow-600' 
            : isOwn 
              ? message.type === 'private' ? 'text-purple-200' : 'text-indigo-200'
              : message.type === 'private' ? 'text-purple-600' : 'text-gray-500'
        }`}>
          {formatTimestamp(new Date(message.timestamp))}
        </div>
      </div>
    </div>
  );
}
