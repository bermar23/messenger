'use client';

import React from 'react';
import { useChat } from '@/context/ChatContext';
import { Users, MapPin, Clock, MessageCircle } from 'lucide-react';

interface UserListProps {
  onPrivateMessage?: (userId: string, username: string) => void;
}

export function UserList({ onPrivateMessage }: UserListProps) {
  const { users, currentUser } = useChat();

  const formatJoinTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date(date));
  };

  const handlePrivateMessage = (userId: string, username: string) => {
    if (onPrivateMessage && userId !== currentUser?.id) {
      onPrivateMessage(userId, username);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {users.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          <Users size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No participants</p>
        </div>
      ) : (
        <div className="space-y-2 p-2">
          {users.map((user) => {
            const isCurrentUser = user.id === currentUser?.id;
            return (
              <div
                key={user.id}
                className={`p-3 rounded-lg transition-colors ${
                  isCurrentUser 
                    ? 'bg-indigo-50 border border-indigo-200' 
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                      <p className={`font-medium text-sm truncate ${
                        isCurrentUser ? 'text-indigo-900' : 'text-gray-900'
                      }`}>
                        {user.username}{isCurrentUser ? ' (You)' : ''}
                      </p>
                    </div>
                    
                    {user.location && (
                      <div className="flex items-center space-x-1 mt-1">
                        <MapPin size={12} className="text-gray-400" />
                        <p className="text-xs text-gray-500 truncate">{user.location}</p>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-1 mt-1">
                      <Clock size={12} className="text-gray-400" />
                      <p className="text-xs text-gray-500">
                        Joined {formatJoinTime(user.joinedAt)}
                      </p>
                    </div>
                  </div>
                  
                  {!isCurrentUser && onPrivateMessage && (
                    <button
                      onClick={() => handlePrivateMessage(user.id, user.username)}
                      className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                      title="Send private message"
                    >
                      <MessageCircle size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
