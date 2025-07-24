'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { User, Message, ChatState } from '@/types';
import { socketManager } from '@/lib/socket';
import { generateUserId, getClientIP, getLocationFromIP } from '@/lib/utils';

interface ChatContextType extends ChatState {
  joinChat: (username: string, email?: string) => Promise<void>;
  sendMessage: (content: string, type?: 'text' | 'emoji') => void;
  leaveChat: () => void;
}

type ChatAction =
  | { type: 'SET_USER'; payload: User }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'SET_USERS'; payload: User[] }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'RESET' };

const initialState: ChatState = {
  messages: [],
  users: [],
  currentUser: null,
  isConnected: false,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, currentUser: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'SET_USERS':
      return { ...state, users: action.payload };
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  const joinChat = useCallback(async (username: string, email?: string) => {
    try {
      const ip = await getClientIP();
      const location = await getLocationFromIP(ip);
      
      const user: User = {
        id: generateUserId(),
        username,
        email,
        ipAddress: ip,
        location: `${location.city}, ${location.country}`,
        joinedAt: new Date(),
      };

      dispatch({ type: 'SET_USER', payload: user });
      
      const socket = socketManager.connect();
      
      socket.emit('user:join', user);
      
      socket.on('chat:message', (message: Message) => {
        dispatch({ type: 'ADD_MESSAGE', payload: message });
      });
      
      socket.on('chat:history', (messages: Message[]) => {
        dispatch({ type: 'SET_MESSAGES', payload: messages });
      });
      
      socket.on('users:list', (users: User[]) => {
        dispatch({ type: 'SET_USERS', payload: users });
      });
      
      socket.on('connect', () => {
        dispatch({ type: 'SET_CONNECTED', payload: true });
      });
      
      socket.on('disconnect', () => {
        dispatch({ type: 'SET_CONNECTED', payload: false });
      });
      
    } catch (error) {
      console.error('Error joining chat:', error);
    }
  }, []);

  const sendMessage = useCallback((content: string, type: 'text' | 'emoji' = 'text') => {
    const socket = socketManager.getSocket();
    if (socket && state.currentUser) {
      const message: Omit<Message, 'id'> = {
        userId: state.currentUser.id,
        username: state.currentUser.username,
        content,
        type,
        timestamp: new Date(),
      };
      
      socket.emit('chat:message', message);
    }
  }, [state.currentUser]);

  const leaveChat = useCallback(() => {
    const socket = socketManager.getSocket();
    if (socket && state.currentUser) {
      socket.emit('user:leave', state.currentUser.id);
    }
    socketManager.disconnect();
    dispatch({ type: 'RESET' });
  }, [state.currentUser]);

  const contextValue: ChatContextType = {
    ...state,
    joinChat,
    sendMessage,
    leaveChat,
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
