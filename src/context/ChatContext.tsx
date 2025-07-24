'use client';

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { User, Message, ChatState, Conversation, PrivateMessage } from '@/types';
import { socketManager } from '@/lib/socket';
import { generateUserId, getClientIP, getLocationFromIP } from '@/lib/utils';

interface ChatContextType extends ChatState {
  joinConversation: (conversationId: string, username: string, email?: string) => Promise<void>;
  createConversation: (name: string, type: 'public' | 'private') => Promise<void>;
  joinByInviteCode: (inviteCode: string) => Promise<void>;
  sendMessage: (content: string, type?: 'text' | 'emoji') => void;
  sendPrivateMessage: (recipientId: string, content: string) => void;
  clearConversation: () => void;
  logout: () => void;
  getConversationList: () => void;
}

type ChatAction =
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_CONVERSATION'; payload: { conversation: Conversation; messages: Message[] } }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'ADD_PRIVATE_MESSAGE'; payload: PrivateMessage }
  | { type: 'SET_PARTICIPANTS'; payload: User[] }
  | { type: 'SET_CONVERSATIONS'; payload: Conversation[] }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'CONVERSATION_CREATED'; payload: Conversation }
  | { type: 'RESET_STATE' };

const initialState: ChatState = {
  messages: [],
  users: [],
  currentUser: null,
  isConnected: false,
  currentConversation: null,
  conversations: [],
  privateMessages: [],
  unreadCounts: {},
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, currentUser: action.payload };
    
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload };
    
    case 'SET_CONVERSATION':
      return {
        ...state,
        currentConversation: action.payload.conversation,
        messages: action.payload.messages,
      };
    
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };
    
    case 'ADD_PRIVATE_MESSAGE':
      return {
        ...state,
        privateMessages: [...state.privateMessages, action.payload],
      };
    
    case 'SET_PARTICIPANTS':
      return { ...state, users: action.payload };
    
    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.payload };
    
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [] };
    
    case 'CONVERSATION_CREATED':
      return {
        ...state,
        conversations: [...state.conversations, action.payload],
      };
    
    case 'RESET_STATE':
      return initialState;
    
    default:
      return state;
  }
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  const joinConversation = useCallback(async (conversationId: string, username: string, email?: string) => {
    try {
      const ipAddress = await getClientIP();
      const location = await getLocationFromIP(ipAddress);
      
      const user: User = {
        id: generateUserId(),
        username,
        email,
        ipAddress,
        location: location ? `${location.city}, ${location.country}` : undefined,
        joinedAt: new Date(),
        isOnline: true,
      };

      dispatch({ type: 'SET_USER', payload: user });

      const socket = socketManager.getSocket();
      if (!socket) return;
      
      // Set up socket listeners
      socket.on('connect', () => {
        dispatch({ type: 'SET_CONNECTED', payload: true });
        socket.emit('conversation:join', { conversationId, user });
      });

      socket.on('disconnect', () => {
        dispatch({ type: 'SET_CONNECTED', payload: false });
      });

      socket.on('conversation:history', (data: { conversation: Conversation; messages: Message[] }) => {
        dispatch({ type: 'SET_CONVERSATION', payload: data });
      });

      socket.on('message:new', (message: Message) => {
        dispatch({ type: 'ADD_MESSAGE', payload: message });
      });

      socket.on('message:private:new', (privateMessage: PrivateMessage) => {
        dispatch({ type: 'ADD_PRIVATE_MESSAGE', payload: privateMessage });
      });

      socket.on('conversation:participants', (participants: User[]) => {
        dispatch({ type: 'SET_PARTICIPANTS', payload: participants });
      });

      socket.on('conversations:list', (conversations: Conversation[]) => {
        dispatch({ type: 'SET_CONVERSATIONS', payload: conversations });
      });

      socket.on('conversation:cleared', () => {
        dispatch({ type: 'CLEAR_MESSAGES' });
      });

      socket.on('conversation:created', (conversation: Conversation) => {
        dispatch({ type: 'CONVERSATION_CREATED', payload: conversation });
      });

      socket.on('error', (error: { message: string }) => {
        console.error('Socket error:', error.message);
        alert(error.message);
      });

      socketManager.connect();
    } catch (error) {
      console.error('Failed to join conversation:', error);
    }
  }, []);

  const createConversation = useCallback(async (name: string, type: 'public' | 'private') => {
    const socket = socketManager.getSocket();
    if (!socket) return;
    socket.emit('conversation:create', { name, type });
  }, []);

  const joinByInviteCode = useCallback(async (inviteCode: string) => {
    if (!state.currentUser) return;
    
    const socket = socketManager.getSocket();
    if (!socket) return;
    socket.emit('conversation:join-by-invite', { inviteCode, user: state.currentUser });
  }, [state.currentUser]);

  const sendMessage = useCallback((content: string, type: 'text' | 'emoji' = 'text') => {
    if (!state.currentConversation) return;
    
    const socket = socketManager.getSocket();
    if (!socket) return;
    socket.emit('message:send', {
      conversationId: state.currentConversation.id,
      content,
      type,
    });
  }, [state.currentConversation]);

  const sendPrivateMessage = useCallback((recipientId: string, content: string) => {
    const socket = socketManager.getSocket();
    if (!socket) return;
    socket.emit('message:private', { recipientId, content });
  }, []);

  const clearConversation = useCallback(() => {
    if (!state.currentConversation) return;
    
    const socket = socketManager.getSocket();
    if (!socket) return;
    socket.emit('conversation:clear', { conversationId: state.currentConversation.id });
  }, [state.currentConversation]);

  const logout = useCallback(() => {
    const socket = socketManager.getSocket();
    if (!socket) return;
    socket.emit('user:logout');
    socketManager.disconnect();
    dispatch({ type: 'RESET_STATE' });
  }, []);

  const getConversationList = useCallback(() => {
    const socket = socketManager.getSocket();
    if (!socket) return;
    socket.emit('conversations:list');
  }, []);

  return (
    <ChatContext.Provider
      value={{
        ...state,
        joinConversation,
        createConversation,
        joinByInviteCode,
        sendMessage,
        sendPrivateMessage,
        clearConversation,
        logout,
        getConversationList,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
