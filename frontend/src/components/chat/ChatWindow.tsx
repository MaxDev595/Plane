import { useEffect, useRef, useState, useCallback } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import Avatar from '../ui/Avatar';
import api from '../../utils/api';
import type { Message, Chat } from '../../types';
import { getSocket } from '../../hooks/useSocket';

function getChatName(chat: Chat, userId: string) {
  if (chat.type === 'group') return chat.name || 'Group';
  const other = chat.members?.find((m) => m.id !== userId);
  return other?.display_name || 'Unknown';
}

function getChatAvatar(chat: Chat, userId: string) {
  if (chat.type === 'group') return { src: chat.avatar_url, name: chat.name || 'G' };
  const other = chat.members?.find((m) => m.id !== userId);
  return { src: other?.avatar_url, name: other?.display_name || '?' };
}

function getChatStatus(chat: Chat, userId: string) {
  if (chat.type !== 'direct') return undefined;
  const other = chat.members?.find((m) => m.id !== userId);
  return other?.status;
}

function shouldShowAvatar(messages: Message[], index: number) {
  if (index === messages.length - 1) return true;
  return messages[index].sender_id !== messages[index + 1]?.sender_id;
}

function isFirstInGroup(messages: Message[], index: number) {
  if (index === 0) return true;
  return messages[index].sender_id !== messages[index - 1]?.sender_id;
}

export default function ChatWindow() {
  const { activeChat, messages, typingUsers, setMessages, prependMessages, clearUnread } = useChatStore();
  const { user } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  const chatMessages = activeChat ? (messages[activeChat.id] || []) : [];
  const typing = activeChat ? (typingUsers[activeChat.id] || []).filter((u) => u.id !== user?.id) : [];

  const loadMessages = useCallback(async (chatId: string) => {
    try {
      const res = await api.get(`/chats/${chatId}/messages?limit=50`);
      setMessages(chatId, res.data.messages);
      setHasMore(res.data.messages.length === 50);
      getSocket()?.emit('message:read', { chatId });
      clearUnread(chatId);
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  }, [setMessages, clearUnread]);

  useEffect(() => {
    if (activeChat) {
      loadMessages(activeChat.id);
      setReplyTo(null);
    }
  }, [activeChat?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
    if (nearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages.length]);

  // Initial scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView();
  }, [activeChat?.id]);

  const loadOlderMessages = async () => {
    if (!activeChat || loadingOlder || !hasMore || chatMessages.length === 0) return;
    setLoadingOlder(true);
    const oldestId = chatMessages[0]?.id;
    const container = containerRef.current;
    const prevScrollHeight = container?.scrollHeight || 0;
    try {
      const res = await api.get(`/chats/${activeChat.id}/messages?limit=50&before=${oldestId}`);
      prependMessages(activeChat.id, res.data.messages);
      setHasMore(res.data.messages.length === 50);
      // Maintain scroll position
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - prevScrollHeight;
        }
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleScroll = () => {
    const container = containerRef.current;
    if (container && container.scrollTop < 100) {
      loadOlderMessages();
    }
  };

  if (!activeChat) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-plane-bg">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-plane-surface">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-plane-muted">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-plane-text">Select a chat</h2>
            <p className="mt-1 text-sm text-plane-muted">Choose a conversation or start a new one</p>
          </div>
        </div>
      </div>
    );
  }

  const chatName = getChatName(activeChat, user!.id);
  const chatAvatar = getChatAvatar(activeChat, user!.id);
  const chatStatus = getChatStatus(activeChat, user!.id);
  const onlineMembers = activeChat.type === 'group'
    ? activeChat.members.filter((m) => m.status === 'online' && m.id !== user?.id).length
    : null;

  return (
    <div className="flex flex-1 flex-col bg-plane-bg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-plane-border px-4 py-3 bg-plane-bg">
        <Avatar src={chatAvatar.src} name={chatAvatar.name} size="md" status={activeChat.type === 'direct' ? chatStatus : undefined} />
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-plane-text truncate">{chatName}</h2>
          <p className="text-xs text-plane-muted">
            {activeChat.type === 'direct'
              ? chatStatus === 'online' ? 'Online' : 'Offline'
              : `${activeChat.members.length} members${onlineMembers ? `, ${onlineMembers} online` : ''}`}
          </p>
        </div>
        {activeChat.type === 'group' && (
          <div className="flex -space-x-2">
            {activeChat.members.slice(0, 4).map((m) => (
              <Avatar key={m.id} src={m.avatar_url} name={m.display_name} size="xs"
                className="ring-2 ring-plane-bg" />
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto py-2" onScroll={handleScroll}>
        {loadingOlder && (
          <div className="flex justify-center py-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-plane-border border-t-plane-accent" />
          </div>
        )}

        {chatMessages.map((msg, i) => (
          <div key={msg.id} className="message-enter">
            <MessageBubble
              message={msg}
              showAvatar={shouldShowAvatar(chatMessages, i)}
              isFirst={isFirstInGroup(chatMessages, i)}
            />
          </div>
        ))}

        {/* Typing indicator */}
        {typing.length > 0 && (
          <div className="flex items-end gap-2 px-4 py-1">
            <div className="flex -space-x-1">
              {typing.slice(0, 2).map((u) => (
                <Avatar key={u.id} src={u.avatar_url} name={u.display_name} size="xs" />
              ))}
            </div>
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-plane-received px-3 py-2">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-plane-muted" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-plane-muted" style={{ animationDelay: '150ms' }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-plane-muted" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs text-plane-muted">
              {typing.map((u) => u.display_name).join(', ')} {typing.length === 1 ? 'is' : 'are'} typing…
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput chatId={activeChat.id} replyTo={replyTo} onClearReply={() => setReplyTo(null)} />
    </div>
  );
}
