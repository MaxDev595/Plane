import { useState } from 'react';
import type { Message } from '../../types';
import { useAuthStore } from '../../store/authStore';
import Avatar from '../ui/Avatar';
import { getSocket } from '../../hooks/useSocket';
import { format } from 'date-fns';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

interface Props {
  message: Message;
  showAvatar: boolean;
  isFirst: boolean;
}

function groupReactions(reactions: Message['reactions']) {
  const map: Record<string, number> = {};
  for (const r of reactions || []) {
    map[r.emoji] = (map[r.emoji] || 0) + 1;
  }
  return Object.entries(map);
}

export default function MessageBubble({ message, showAvatar, isFirst }: Props) {
  const { user } = useAuthStore();
  const isMine = message.sender_id === user?.id;
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');

  const handleDelete = () => {
    getSocket()?.emit('message:delete', { messageId: message.id });
    setShowMenu(false);
  };

  const handleEdit = () => {
    getSocket()?.emit('message:edit', { messageId: message.id, content: editContent });
    setEditing(false);
  };

  const handleReact = (emoji: string) => {
    getSocket()?.emit('message:react', { messageId: message.id, emoji });
    setShowEmojiPicker(false);
  };

  const reactionGroups = groupReactions(message.reactions);
  const myReactions = new Set((message.reactions || []).filter((r) => r.user_id === user?.id).map((r) => r.emoji));

  if (message.is_deleted) {
    return (
      <div className={`flex items-end gap-2 px-4 py-0.5 ${isMine ? 'flex-row-reverse' : ''}`}>
        {!isMine && <div className="w-9 flex-shrink-0" />}
        <div className="rounded-2xl border border-plane-border px-3 py-2 text-sm italic text-plane-muted">
          🗑 Message deleted
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-end gap-2 px-4 py-0.5 ${isMine ? 'flex-row-reverse' : ''}`}
      onMouseLeave={() => { setShowMenu(false); setShowEmojiPicker(false); }}
    >
      {/* Avatar */}
      {!isMine && (
        <div className="w-9 flex-shrink-0">
          {showAvatar ? (
            <Avatar src={message.sender?.avatar_url} name={message.sender?.display_name || '?'} size="sm" />
          ) : (
            <div className="w-9" />
          )}
        </div>
      )}

      <div className={`flex flex-col gap-1 max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>
        {/* Sender name for groups */}
        {!isMine && isFirst && message.sender && (
          <span className="ml-1 text-xs font-medium" style={{ color: '#4f8ef7' }}>
            {message.sender.display_name}
          </span>
        )}

        {/* Reply preview */}
        {message.reply_message && (
          <div className={`flex items-start gap-2 rounded-lg border-l-2 border-plane-accent bg-white/5 px-2 py-1 ${isMine ? 'border-l-plane-accent' : ''}`}>
            <p className="text-xs text-plane-muted line-clamp-2">
              {message.reply_message.content || '📎 Attachment'}
            </p>
          </div>
        )}

        {/* Bubble */}
        <div className="relative">
          <div
            className={`relative rounded-2xl px-3 py-2 text-sm ${
              isMine
                ? 'rounded-br-sm bg-plane-accent text-white'
                : 'rounded-bl-sm bg-plane-received text-plane-text'
            }`}
          >
            {/* File/Image */}
            {message.type === 'image' && message.file_url && (
              <a href={message.file_url} target="_blank" rel="noreferrer">
                <img
                  src={message.file_url}
                  alt="Image"
                  className="mb-1 max-h-60 rounded-lg object-cover"
                  style={{ maxWidth: '280px' }}
                />
              </a>
            )}
            {message.type === 'file' && message.file_url && (
              <a href={message.file_url} target="_blank" rel="noreferrer"
                className="mb-1 flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <div>
                  <p className="text-xs font-medium">{message.file_name || 'File'}</p>
                  {message.file_size && (
                    <p className="text-xs opacity-70">{(message.file_size / 1024).toFixed(1)} KB</p>
                  )}
                </div>
              </a>
            )}

            {/* Text */}
            {editing ? (
              <div>
                <textarea
                  autoFocus
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit(); } if (e.key === 'Escape') setEditing(false); }}
                  className="w-full resize-none bg-transparent text-sm outline-none"
                  rows={2}
                />
                <div className="flex gap-2 mt-1">
                  <button onClick={handleEdit} className="text-xs opacity-80 hover:opacity-100">Save</button>
                  <button onClick={() => setEditing(false)} className="text-xs opacity-60 hover:opacity-100">Cancel</button>
                </div>
              </div>
            ) : (
              message.content && <p className="break-words whitespace-pre-wrap leading-relaxed">{message.content}</p>
            )}

            {/* Time + edited */}
            <div className={`mt-0.5 flex items-center gap-1 ${isMine ? 'justify-end' : ''}`}>
              {message.is_edited && <span className="text-[10px] opacity-60">edited</span>}
              <span className="text-[10px] opacity-60">
                {format(new Date(message.created_at), 'HH:mm')}
              </span>
            </div>
          </div>

          {/* Hover actions */}
          <div className={`absolute top-0 hidden group-hover:flex items-center gap-1 z-10 ${isMine ? 'right-full mr-2' : 'left-full ml-2'}`}>
            <button onClick={() => setShowEmojiPicker((v) => !v)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-plane-surface border border-plane-border text-plane-muted hover:text-plane-text text-base hover:bg-plane-border transition">
              😊
            </button>
            <button onClick={() => setShowMenu((v) => !v)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-plane-surface border border-plane-border text-plane-muted hover:text-plane-text hover:bg-plane-border transition">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
              </svg>
            </button>
          </div>

          {/* Emoji picker */}
          {showEmojiPicker && (
            <div className={`absolute top-0 z-20 flex gap-1 rounded-xl border border-plane-border bg-plane-surface p-2 shadow-lg ${isMine ? 'right-full mr-10' : 'left-full ml-10'}`}>
              {EMOJIS.map((e) => (
                <button key={e} onClick={() => handleReact(e)}
                  className={`text-lg transition hover:scale-110 ${myReactions.has(e) ? 'opacity-50' : ''}`}>
                  {e}
                </button>
              ))}
            </div>
          )}

          {/* Context menu */}
          {showMenu && (
            <div className={`absolute top-6 z-20 min-w-[140px] rounded-xl border border-plane-border bg-plane-surface shadow-xl overflow-hidden ${isMine ? 'right-full mr-2' : 'left-full ml-2'}`}>
              <button onClick={() => { /* TODO: set reply in parent */ setShowMenu(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-plane-text hover:bg-white/5 transition">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
                </svg>
                Reply
              </button>
              {isMine && (
                <button onClick={() => { setEditing(true); setShowMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-plane-text hover:bg-white/5 transition">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 1 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Edit
                </button>
              )}
              {isMine && (
                <button onClick={handleDelete}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                  Delete
                </button>
              )}
            </div>
          )}
        </div>

        {/* Reactions */}
        {reactionGroups.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {reactionGroups.map(([emoji, count]) => (
              <button key={emoji} onClick={() => handleReact(emoji)}
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition ${myReactions.has(emoji) ? 'border-plane-accent bg-plane-accent/20 text-plane-accent' : 'border-plane-border bg-plane-surface text-plane-text hover:bg-white/5'}`}>
                <span>{emoji}</span>
                <span>{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
