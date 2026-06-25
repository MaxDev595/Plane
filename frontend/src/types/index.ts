export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  status: 'online' | 'offline' | 'away';
  last_seen?: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  sender?: User;
  content?: string;
  type: 'text' | 'image' | 'file' | 'system';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  reply_to?: string;
  reply_message?: Partial<Message>;
  reactions?: Reaction[];
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Reaction {
  emoji: string;
  user_id: string;
}

export interface Chat {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  description?: string;
  avatar_url?: string;
  members: User[];
  last_message?: Partial<Message>;
  unread_count: number;
  last_read_at: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  displayName: string;
}

export interface ChatState {
  chats: Chat[];
  activeChat: Chat | null;
  messages: Record<string, Message[]>;
  typingUsers: Record<string, User[]>;
  setActiveChat: (chat: Chat | null) => void;
  setChats: (chats: Chat[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (message: Message) => void;
  deleteMessage: (messageId: string, chatId: string) => void;
  updateReaction: (data: { messageId: string; userId: string; emoji: string; action: 'added' | 'removed' }) => void;
  setMessages: (chatId: string, messages: Message[]) => void;
  prependMessages: (chatId: string, messages: Message[]) => void;
  setTyping: (chatId: string, users: User[]) => void;
  updateChatLastMessage: (message: Message) => void;
  incrementUnread: (chatId: string) => void;
  clearUnread: (chatId: string) => void;
}
