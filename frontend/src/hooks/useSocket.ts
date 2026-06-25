import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import type { Message, User } from '../types';

let socket: Socket | null = null;

export const useSocket = () => {
  const { token, user } = useAuthStore();
  const { addMessage, updateMessage, deleteMessage, updateReaction, setTyping, updateChatLastMessage, incrementUnread, activeChat } = useChatStore();
  const typingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!token || !user) return;

    socket = io('http://localhost:3001', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => console.log('Socket connected'));
    socket.on('connect_error', (err) => console.error('Socket error:', err.message));

    socket.on('message:new', (message: Message) => {
      addMessage(message);
      updateChatLastMessage(message);
      if (message.sender_id !== user.id && message.chat_id !== activeChat?.id) {
        incrementUnread(message.chat_id);
      }
    });

    socket.on('message:edited', (message: Message) => updateMessage(message));

    socket.on('message:deleted', ({ messageId, chatId }: { messageId: string; chatId: string }) => {
      deleteMessage(messageId, chatId);
    });

    socket.on('message:reaction', (data: { messageId: string; userId: string; emoji: string; action: 'added' | 'removed' }) => {
      updateReaction(data);
    });

    socket.on('typing:start', ({ chatId, user: typingUser }: { chatId: string; userId: string; user: User }) => {
      const { typingUsers } = useChatStore.getState();
      const current = typingUsers[chatId] || [];
      if (!current.find((u) => u.id === typingUser.id)) {
        setTyping(chatId, [...current, typingUser]);
      }
      if (typingTimeouts.current[typingUser.id]) clearTimeout(typingTimeouts.current[typingUser.id]);
      typingTimeouts.current[typingUser.id] = setTimeout(() => {
        const { typingUsers: t } = useChatStore.getState();
        setTyping(chatId, (t[chatId] || []).filter((u) => u.id !== typingUser.id));
      }, 3000);
    });

    socket.on('typing:stop', ({ chatId, userId }: { chatId: string; userId: string }) => {
      const { typingUsers } = useChatStore.getState();
      setTyping(chatId, (typingUsers[chatId] || []).filter((u) => u.id !== userId));
    });

    socket.on('user:status', ({ userId, status }: { userId: string; status: string }) => {
      const { chats } = useChatStore.getState();
      // Update member status in chats
      useChatStore.setState({
        chats: chats.map((c) => ({
          ...c,
          members: c.members.map((m) => (m.id === userId ? { ...m, status: status as any } : m)),
        })),
      });
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [token, user?.id]);

  return socket;
};

export const getSocket = () => socket;
