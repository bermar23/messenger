export interface User {
  id: string;
  username: string;
  email?: string;
  ipAddress?: string;
  location?: string;
  joinedAt: Date;
  isOnline: boolean;
}

export interface Message {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'emoji' | 'system' | 'private';
  conversationId: string;
  recipientId?: string; // For private messages
}

export interface Conversation {
  id: string;
  name: string;
  type: 'public' | 'private';
  createdBy: string;
  createdAt: Date;
  inviteCode?: string;
  participants: string[];
  isActive: boolean;
}

export interface PrivateMessage {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  timestamp: Date;
  conversationId: string;
  isRead: boolean;
}

export interface ChatState {
  messages: Message[];
  users: User[];
  currentUser: User | null;
  isConnected: boolean;
  currentConversation: Conversation | null;
  conversations: Conversation[];
  privateMessages: PrivateMessage[];
  unreadCounts: Record<string, number>;
}

export interface LocationData {
  country?: string;
  region?: string;
  city?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
}
