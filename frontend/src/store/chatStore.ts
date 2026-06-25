import { create } from 'zustand';
import type { ChatState, Message, Chat, User } from '../types';

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  activeChat: null,
  messages: {},
  typingUsers: {},

  setChats: (chats) => set({ chats }),

  setActiveChat: (chat) => set({ activeChat: chat }),

  setMessages: (chatId, messages) =>
    set((s) => ({ messages: { ...s.messages, [chatId]: messages } })),

  prependMessages: (chatId, messages) =>
    set((s) => ({
      messages: { ...s.messages, [chatId]: [...messages, ...(s.messages[chatId] || [])] },
    })),

  addMessage: (message) =>
    set((s) => {
      const chatId = message.chat_id;
      const existing = s.messages[chatId] || [];
      if (existing.find((m) => m.id === message.id)) return s;
      return { messages: { ...s.messages, [chatId]: [...existing, message] } };
    }),

  updateMessage: (message) =>
    set((s) => {
      const chatId = message.chat_id;
      const msgs = (s.messages[chatId] || []).map((m) => (m.id === message.id ? message : m));
      return { messages: { ...s.messages, [chatId]: msgs } };
    }),

  deleteMessage: (messageId, chatId) =>
    set((s) => {
      const msgs = (s.messages[chatId] || []).map((m) =>
        m.id === messageId ? { ...m, is_deleted: true, content: undefined } : m
      );
      return { messages: { ...s.messages, [chatId]: msgs } };
    }),

  updateReaction: ({ messageId, userId, emoji, action }) =>
    set((s) => {
      const newMessages = { ...s.messages };
      for (const chatId in newMessages) {
        newMessages[chatId] = newMessages[chatId].map((m) => {
          if (m.id !== messageId) return m;
          let reactions = [...(m.reactions || [])];
          if (action === 'removed') {
            reactions = reactions.filter((r) => !(r.user_id === userId && r.emoji === emoji));
          } else {
            reactions = [...reactions, { emoji, user_id: userId }];
          }
          return { ...m, reactions };
        });
      }
      return { messages: newMessages };
    }),

  setTyping: (chatId, users) =>
    set((s) => ({ typingUsers: { ...s.typingUsers, [chatId]: users } })),

  updateChatLastMessage: (message) =>
    set((s) => ({
      chats: s.chats.map((c) =>
        c.id === message.chat_id ? { ...c, last_message: message } : c
      ).sort((a, b) => {
        const aTime = a.last_message?.created_at || a.created_at;
        const bTime = b.last_message?.created_at || b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      }),
    })),

  incrementUnread: (chatId) =>
    set((s) => ({
      chats: s.chats.map((c) =>
        c.id === chatId ? { ...c, unread_count: (c.unread_count || 0) + 1 } : c
      ),
    })),

  clearUnread: (chatId) =>
    set((s) => ({
      chats: s.chats.map((c) => (c.id === chatId ? { ...c, unread_count: 0 } : c)),
    })),
}));
