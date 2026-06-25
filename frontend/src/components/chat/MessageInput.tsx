import { useState, useRef, useCallback } from 'react';
import { getSocket } from '../../hooks/useSocket';
import { useAuthStore } from '../../store/authStore';
import api from '../../utils/api';
import type { Message } from '../../types';

interface Props {
  chatId: string;
  replyTo: Message | null;
  onClearReply: () => void;
}

export default function MessageInput({ chatId, replyTo, onClearReply }: Props) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const { user } = useAuthStore();

  const handleTyping = useCallback(() => {
    const socket = getSocket();
    if (!socket) return;
    if (!typingRef.current) {
      typingRef.current = true;
      socket.emit('typing:start', { chatId });
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      typingRef.current = false;
      socket.emit('typing:stop', { chatId });
    }, 2000);
  }, [chatId]);

  const sendMessage = useCallback(() => {
    const content = text.trim();
    if (!content) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit('message:send', {
      chatId,
      content,
      type: 'text',
      replyTo: replyTo?.id,
    });

    setText('');
    onClearReply();
    clearTimeout(typingTimerRef.current);
    typingRef.current = false;
    socket.emit('typing:stop', { chatId });
  }, [text, chatId, replyTo, onClearReply]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const socket = getSocket();
    if (!socket) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const { url, name, size } = res.data;
      const isImage = file.type.startsWith('image/');

      socket.emit('message:send', {
        chatId,
        type: isImage ? 'image' : 'file',
        fileUrl: url,
        fileName: name,
        fileSize: size,
        replyTo: replyTo?.id,
      });
      onClearReply();
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="border-t border-plane-border bg-plane-bg px-4 py-3">
      {/* Reply preview */}
      {replyTo && (
        <div className="mb-2 flex items-center justify-between rounded-lg border-l-2 border-plane-accent bg-plane-surface px-3 py-2">
          <div>
            <p className="text-xs font-medium text-plane-accent">Reply to {replyTo.sender?.display_name}</p>
            <p className="text-xs text-plane-muted line-clamp-1">{replyTo.content || '📎 Attachment'}</p>
          </div>
          <button onClick={onClearReply} className="text-plane-muted hover:text-plane-text ml-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Attach */}
        <button onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-plane-muted hover:bg-plane-surface hover:text-plane-text transition disabled:opacity-50">
          {uploading ? (
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M12 3a9 9 0 0 1 9 9"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          )}
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.mp4" />

        {/* Text area */}
        <div className="flex-1 rounded-2xl border border-plane-border bg-plane-surface px-4 py-2.5">
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); handleTyping(); }}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            rows={1}
            className="w-full resize-none bg-transparent text-sm text-plane-text placeholder-plane-muted outline-none leading-relaxed"
            style={{ maxHeight: '120px', overflowY: 'auto' }}
          />
        </div>

        {/* Send */}
        <button onClick={sendMessage} disabled={!text.trim()}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-plane-accent text-white transition hover:bg-plane-accent-hover disabled:opacity-40">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
