import { useState, useEffect, useCallback } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import Avatar from '../ui/Avatar';
import api from '../../utils/api';
import type { Chat, User } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { getSocket } from '../../hooks/useSocket';

function formatTime(dateStr?: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffH = (now.getTime() - d.getTime()) / 3600000;
    if (diffH < 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffH < 48) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

function getChatName(chat: Chat, currentUserId: string) {
  if (chat.type === 'group') return chat.name || 'Group';
  const other = chat.members?.find((m) => m.id !== currentUserId);
  return other?.display_name || 'Unknown';
}

function getChatAvatar(chat: Chat, currentUserId: string) {
  if (chat.type === 'group') return { src: chat.avatar_url, name: chat.name || 'G' };
  const other = chat.members?.find((m) => m.id !== currentUserId);
  return { src: other?.avatar_url, name: other?.display_name || '?' };
}

function getChatStatus(chat: Chat, currentUserId: string) {
  if (chat.type !== 'direct') return undefined;
  const other = chat.members?.find((m) => m.id !== currentUserId);
  return other?.status;
}

export default function Sidebar() {
  const { chats, setChats, activeChat, setActiveChat, clearUnread } = useChatStore();
  const { user, logout } = useAuthStore();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);

  const loadChats = useCallback(async () => {
    try {
      const res = await api.get('/chats');
      setChats(res.data.chats);
    } catch (err) {
      console.error('Failed to load chats', err);
    }
  }, [setChats]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    if (!search.trim() || search.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(search)}`);
        setSearchResults(res.data.users);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const openDirectChat = async (userId: string) => {
    try {
      const res = await api.post('/chats/direct', { userId });
      const chatId = res.data.chatId;
      getSocket()?.emit('chat:join', { chatId });
      await loadChats();
      const { chats } = useChatStore.getState();
      const chat = chats.find((c) => c.id === chatId);
      if (chat) setActiveChat(chat);
      setSearch('');
      setSearchResults([]);
      setShowNewChat(false);
    } catch (err) {
      console.error(err);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) return;
    try {
      const res = await api.post('/chats/group', {
        name: groupName,
        memberIds: selectedMembers.map((m) => m.id),
      });
      getSocket()?.emit('chat:join', { chatId: res.data.chatId });
      await loadChats();
      const { chats } = useChatStore.getState();
      const chat = chats.find((c) => c.id === res.data.chatId);
      if (chat) setActiveChat(chat);
      setShowNewGroup(false);
      setGroupName('');
      setSelectedMembers([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChatClick = (chat: Chat) => {
    setActiveChat(chat);
    clearUnread(chat.id);
  };

  const filteredChats = chats.filter((c) => {
    if (!search.trim()) return true;
    const name = getChatName(c, user!.id).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="flex h-full w-72 flex-shrink-0 flex-col border-r border-plane-border bg-plane-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-plane-border">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-plane-accent">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-base font-semibold text-plane-text">Plane</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => { setShowNewGroup(true); setShowNewChat(false); }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-plane-muted hover:bg-plane-surface hover:text-plane-text transition"
            title="New Group">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </button>
          <button onClick={() => { setShowNewChat(true); setShowNewGroup(false); }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-plane-muted hover:bg-plane-surface hover:text-plane-text transition"
            title="New Message">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              <line x1="12" y1="8" x2="12" y2="14"/><line x1="9" y1="11" x2="15" y2="11"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 rounded-lg bg-plane-surface px-3 py-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-plane-muted flex-shrink-0">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="flex-1 bg-transparent text-sm text-plane-text placeholder-plane-muted outline-none"
          />
          {search && (
            <button onClick={() => { setSearch(''); setSearchResults([]); }} className="text-plane-muted hover:text-plane-text">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* New direct chat */}
      {showNewChat && (
        <div className="border-b border-plane-border px-3 pb-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-plane-muted">NEW MESSAGE</span>
            <button onClick={() => setShowNewChat(false)} className="text-plane-muted hover:text-plane-text text-xs">✕</button>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-plane-surface px-3 py-2">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="flex-1 bg-transparent text-sm text-plane-text placeholder-plane-muted outline-none"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-1 rounded-lg border border-plane-border bg-plane-surface overflow-hidden">
              {searchResults.map((u) => (
                <button key={u.id} onClick={() => openDirectChat(u.id)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition">
                  <Avatar src={u.avatar_url} name={u.display_name} size="sm" status={u.status} />
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-medium text-plane-text truncate">{u.display_name}</p>
                    <p className="text-xs text-plane-muted">@{u.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New group */}
      {showNewGroup && (
        <div className="border-b border-plane-border px-3 pb-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-plane-muted">NEW GROUP</span>
            <button onClick={() => setShowNewGroup(false)} className="text-plane-muted hover:text-plane-text text-xs">✕</button>
          </div>
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name"
            className="mb-2 w-full rounded-lg border border-plane-border bg-plane-surface px-3 py-2 text-sm text-plane-text placeholder-plane-muted outline-none focus:border-plane-accent"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Add members..."
            className="w-full rounded-lg border border-plane-border bg-plane-surface px-3 py-2 text-sm text-plane-text placeholder-plane-muted outline-none focus:border-plane-accent"
          />
          {selectedMembers.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {selectedMembers.map((m) => (
                <span key={m.id} className="flex items-center gap-1 rounded-full bg-plane-accent/20 px-2 py-0.5 text-xs text-plane-accent">
                  {m.display_name}
                  <button onClick={() => setSelectedMembers((prev) => prev.filter((x) => x.id !== m.id))}>✕</button>
                </span>
              ))}
            </div>
          )}
          {searchResults.length > 0 && (
            <div className="mt-1 rounded-lg border border-plane-border bg-plane-surface overflow-hidden max-h-32 overflow-y-auto">
              {searchResults.filter((u) => !selectedMembers.find((m) => m.id === u.id)).map((u) => (
                <button key={u.id} onClick={() => { setSelectedMembers((p) => [...p, u]); setSearch(''); setSearchResults([]); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition">
                  <Avatar src={u.avatar_url} name={u.display_name} size="xs" />
                  <span className="text-sm text-plane-text">{u.display_name}</span>
                </button>
              ))}
            </div>
          )}
          <button onClick={createGroup} disabled={!groupName.trim()}
            className="mt-2 w-full rounded-lg bg-plane-accent py-2 text-sm font-medium text-white transition hover:bg-plane-accent-hover disabled:opacity-40">
            Create Group
          </button>
        </div>
      )}

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 && !showNewChat && (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <p className="text-sm text-plane-muted">No chats yet</p>
            <p className="text-xs text-plane-muted mt-1">Start a new conversation</p>
          </div>
        )}
        {filteredChats.map((chat) => {
          const name = getChatName(chat, user!.id);
          const avatar = getChatAvatar(chat, user!.id);
          const status = getChatStatus(chat, user!.id);
          const isActive = activeChat?.id === chat.id;
          const lastMsg = chat.last_message;
          const lastMsgText = lastMsg?.is_deleted ? '🗑 Message deleted'
            : lastMsg?.type === 'image' ? '📷 Image'
            : lastMsg?.type === 'file' ? `📎 ${lastMsg.file_name || 'File'}`
            : lastMsg?.content || '';

          return (
            <button
              key={chat.id}
              onClick={() => handleChatClick(chat)}
              className={`flex w-full items-center gap-3 px-3 py-2.5 transition ${isActive ? 'bg-plane-surface' : 'hover:bg-white/[0.03]'}`}
            >
              <Avatar src={avatar.src} name={avatar.name} size="md" status={chat.type === 'direct' ? status : undefined} />
              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-plane-text truncate">{name}</span>
                  <span className="ml-2 flex-shrink-0 text-xs text-plane-muted">{formatTime(lastMsg?.created_at)}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-plane-muted truncate max-w-[160px]">{lastMsgText}</p>
                  {chat.unread_count > 0 && (
                    <span className="ml-2 flex-shrink-0 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-plane-accent px-1 text-xs font-medium text-white">
                      {chat.unread_count > 99 ? '99+' : chat.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* User profile */}
      <div className="flex items-center gap-3 border-t border-plane-border px-3 py-3">
        <Avatar src={user?.avatar_url} name={user?.display_name || 'U'} size="sm" status="online" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-plane-text truncate">{user?.display_name}</p>
          <p className="text-xs text-plane-muted">@{user?.username}</p>
        </div>
        <button onClick={logout} title="Sign out"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-plane-muted hover:bg-plane-surface hover:text-plane-text transition">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
