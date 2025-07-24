'use client';

import React, { useState, useEffect } from 'react';
import { useChat } from '@/context/ChatContext';
import { Plus, Hash, Lock, Users, Copy, LogOut } from 'lucide-react';

export function ConversationSelector() {
  const { 
    conversations, 
    currentConversation, 
    createConversation, 
    joinByInviteCode,
    getConversationList,
    logout 
  } = useChat();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newConversationName, setNewConversationName] = useState('');
  const [conversationType, setConversationType] = useState<'public' | 'private'>('public');
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    getConversationList();
  }, [getConversationList]);

  const handleCreateConversation = async () => {
    if (!newConversationName.trim()) return;
    
    await createConversation(newConversationName.trim(), conversationType);
    setNewConversationName('');
    setShowCreateModal(false);
  };

  const handleJoinByInvite = async () => {
    if (!inviteCode.trim()) return;
    
    await joinByInviteCode(inviteCode.trim());
    setInviteCode('');
    setShowJoinModal(false);
  };

  const copyInviteLink = (conversation: any) => {
    if (conversation.inviteCode) {
      const url = `${window.location.origin}?invite=${conversation.inviteCode}`;
      navigator.clipboard.writeText(url);
      alert('Invite link copied to clipboard!');
    }
  };

  return (
    <div className="w-64 bg-gray-900 text-white h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold">Conversations</h2>
        <div className="mt-2 space-x-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Create conversation"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Join by invite code"
          >
            <Users size={16} />
          </button>
          <button
            onClick={logout}
            className="p-1 text-gray-400 hover:text-red-400 transition-colors ml-auto"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-800 transition-colors ${
              currentConversation?.id === conversation.id ? 'bg-gray-800' : ''
            }`}
          >
            <div className="flex items-center space-x-2">
              {conversation.type === 'public' ? (
                <Hash size={16} className="text-gray-400" />
              ) : (
                <Lock size={16} className="text-gray-400" />
              )}
              <span className="font-medium truncate">{conversation.name}</span>
              {conversation.type === 'private' && conversation.inviteCode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyInviteLink(conversation);
                  }}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  title="Copy invite link"
                >
                  <Copy size={12} />
                </button>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {conversation.participants.length} participants
            </div>
          </div>
        ))}
      </div>

      {/* Create Conversation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white text-black p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Create Conversation</h3>
            
            <div className="space-y-4">
              <input
                type="text"
                value={newConversationName}
                onChange={(e) => setNewConversationName(e.target.value)}
                placeholder="Conversation name"
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateConversation()}
              />
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">Type</label>
                <div className="space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="public"
                      checked={conversationType === 'public'}
                      onChange={(e) => setConversationType(e.target.value as 'public')}
                      className="mr-2"
                    />
                    Public
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="private"
                      checked={conversationType === 'private'}
                      onChange={(e) => setConversationType(e.target.value as 'private')}
                      className="mr-2"
                    />
                    Private
                  </label>
                </div>
              </div>
            </div>

            <div className="flex space-x-2 mt-6">
              <button
                onClick={handleCreateConversation}
                className="flex-1 bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join by Invite Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white text-black p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Join Conversation</h3>
            
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter invite code"
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleJoinByInvite()}
            />

            <div className="flex space-x-2 mt-6">
              <button
                onClick={handleJoinByInvite}
                className="flex-1 bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors"
              >
                Join
              </button>
              <button
                onClick={() => setShowJoinModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
