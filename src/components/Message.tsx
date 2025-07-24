'use client';

import React from 'react';
import { Message as MessageType } from '@/types';
import { formatTimestamp } from '@/lib/utils';

interface MessageProps {
  message: MessageType;
  isOwn: boolean;
}

export function Message({ message, isOwn }: MessageProps) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isOwn 
          ? 'bg-indigo-600 text-white' 
          : 'bg-gray-100 text-gray-900'
      }`}>
        {!isOwn && (
          <div className="text-xs font-medium mb-1 opacity-75">
            {message.username}
          </div>
        )}
        <div className={`${message.type === 'emoji' ? 'text-2xl' : 'text-sm'}`}>
          {message.content}
        </div>
        <div className={`text-xs mt-1 ${isOwn ? 'text-indigo-200' : 'text-gray-500'}`}>
          {formatTimestamp(new Date(message.timestamp))}
        </div>
      </div>
    </div>
  );
}
