'use client';

import React, { useState, useEffect } from 'react';
import { useChat } from '@/context/ChatContext';
import { isValidEmail } from '@/lib/utils';
import { Hash, Lock, Users } from 'lucide-react';

interface LoginFormProps {
  inviteCode?: string;
}

export function LoginForm({ inviteCode }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [conversationId, setConversationId] = useState('public');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { joinConversation, joinByInviteCode } = useChat();

  useEffect(() => {
    if (inviteCode) {
      setConversationId('invite');
    }
  }, [inviteCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    
    if (username.trim().length < 2) {
      setError('Username must be at least 2 characters');
      return;
    }
    
    if (email && !isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (conversationId === 'invite' && inviteCode) {
        // First join the public conversation to initialize user
        await joinConversation('public', username.trim(), email || undefined);
        // Then join by invite code
        setTimeout(() => {
          joinByInviteCode(inviteCode);
        }, 1000);
      } else {
        await joinConversation(conversationId, username.trim(), email || undefined);
      }
    } catch (error) {
      setError('Failed to join conversation. Please try again.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Project Messenger</h1>
          <p className="text-gray-600">
            {inviteCode ? 'Join private conversation' : 'Real-time messaging application'}
          </p>
        </div>

        {inviteCode && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <Lock size={16} className="text-purple-600" />
              <span className="text-purple-800 font-medium">Private Invitation</span>
            </div>
            <p className="text-purple-700 text-sm mt-1">
              You've been invited to join a private conversation
            </p>
            <p className="text-purple-600 text-xs mt-1 font-mono">
              Code: {inviteCode}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter your username"
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email (optional)
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter your email"
              disabled={isLoading}
            />
          </div>

          {!inviteCode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Join Conversation
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    value="public"
                    checked={conversationId === 'public'}
                    onChange={(e) => setConversationId(e.target.value)}
                    className="text-indigo-600"
                    disabled={isLoading}
                  />
                  <Hash size={16} className="text-gray-500" />
                  <div>
                    <div className="font-medium">General Chat</div>
                    <div className="text-sm text-gray-500">Public conversation for everyone</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !username.trim()}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <Users size={16} />
                <span>
                  {inviteCode ? 'Join Private Conversation' : 'Join General Chat'}
                </span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            Your IP address and location will be detected for enhanced features
          </p>
        </div>
      </div>
    </div>
  );
}
