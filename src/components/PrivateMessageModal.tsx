'use client';

import React, { useState } from 'react';
import { useChat } from '@/context/ChatContext';
import { X, Send } from 'lucide-react';

interface PrivateMessageModalProps {
  recipientId: string;
  recipientUsername: string;
  onClose: () => void;
}

export function PrivateMessageModal({ recipientId, recipientUsername, onClose }: PrivateMessageModalProps) {
  const [message, setMessage] = useState('');
  const { sendPrivateMessage } = useChat();

  const handleSend = () => {
    if (!message.trim()) return;
    
    sendPrivateMessage(recipientId, message.trim());
    setMessage('');
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-96 max-h-80 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">
            Private message to {recipientUsername}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Message Input */}
        <div className="p-4 flex-1">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your private message..."
            className="w-full h-24 p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
            autoFocus
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <Send size={16} />
            <span>Send Private Message</span>
          </button>
        </div>
      </div>
    </div>
  );
}
