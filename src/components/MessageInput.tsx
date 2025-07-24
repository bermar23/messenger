'use client';

import React, { useState, useRef } from 'react';
import { useChat } from '@/context/ChatContext';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { Smile, Send } from 'lucide-react';

export function MessageInput() {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { sendMessage, isConnected } = useChat();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !isConnected) return;
    
    sendMessage(message.trim());
    setMessage('');
    setShowEmojiPicker(false);
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    // Send emoji as a separate message
    sendMessage(emojiData.emoji, 'emoji');
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <div className="border-t bg-white p-4 relative">
      {showEmojiPicker && (
        <div className="absolute bottom-16 right-4 z-10">
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            width={300}
            height={400}
          />
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "Type a message..." : "Connecting..."}
            disabled={!isConnected}
            className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
            maxLength={500}
          />
          
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Smile size={20} />
          </button>
        </div>
        
        <button
          type="submit"
          disabled={!message.trim() || !isConnected}
          className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={20} />
        </button>
      </form>
      
      <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
        <span>{message.length}/500</span>
        <span className={`flex items-center ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
          <span className={`w-2 h-2 rounded-full mr-1 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    </div>
  );
}
