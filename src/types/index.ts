export interface User {
  id: string;
  username: string;
  email?: string;
  ipAddress?: string;
  location?: string;
  joinedAt: Date;
}

export interface Message {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'emoji';
}

export interface ChatState {
  messages: Message[];
  users: User[];
  currentUser: User | null;
  isConnected: boolean;
}

export interface LocationData {
  country?: string;
  region?: string;
  city?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
}
