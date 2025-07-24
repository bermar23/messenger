'use client';

import React from 'react';
import { useChat } from '@/context/ChatContext';
import { Users, MapPin, Clock } from 'lucide-react';

export function UserList() {
  const { users, currentUser } = useChat();

  const formatJoinTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date(date));
  };

  return (
    <div className="bg-gray-50 border-l border-gray-200 w-64 flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-2">
          <Users size={20} className="text-gray-600" />
          <h3 className="font-semibold text-gray-900">
            Online Users ({users.length})
          </h3>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {users.length === 0 ? (
          <div className="text-center text-gray-500 text-sm">
            No users online
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className={`p-3 rounded-lg border ${
                user.id === currentUser?.id
                  ? 'bg-indigo-50 border-indigo-200'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="font-medium text-gray-900 text-sm">
                  {user.username}
                  {user.id === currentUser?.id && (
                    <span className="ml-1 text-indigo-600">(You)</span>
                  )}
                </span>
              </div>
              
              {user.email && (
                <div className="text-xs text-gray-600 mb-1 truncate">
                  {user.email}
                </div>
              )}
              
              {user.location && (
                <div className="flex items-center space-x-1 text-xs text-gray-500 mb-1">
                  <MapPin size={12} />
                  <span className="truncate">{user.location}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Clock size={12} />
                <span>Joined {formatJoinTime(user.joinedAt)}</span>
              </div>
              
              {user.ipAddress && user.ipAddress !== 'localhost' && (
                <div className="text-xs text-gray-400 mt-1 font-mono">
                  {user.ipAddress}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
