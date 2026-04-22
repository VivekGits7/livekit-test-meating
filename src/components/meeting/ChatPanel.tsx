import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useChat, useLocalParticipant } from '@livekit/components-react';
import { AxiosInstance } from 'axios';
import { Send, X, Bot, User as UserIcon, Loader2, AlertCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import {
  makeApiClient,
  listMeetingMessages,
  sendMeetingMessage,
  type InMeetingMessage,
} from '@/lib/api';
import type { JoinSession } from '@/types/session';

interface ChatPanelProps {
  session: JoinSession;
  onClose: () => void;
}

interface ChatItem {
  id: string;
  content: string;
  senderName: string;
  senderType: 'human' | 'ai_agent';
  isLocal: boolean;
  timestamp: number;
}

const POLL_INTERVAL_MS = 10_000;

export default function ChatPanel({ session, onClose }: ChatPanelProps) {
  const { localParticipant } = useLocalParticipant();
  const { chatMessages, send, isSending } = useChat();

  const [history, setHistory] = useState<InMeetingMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const persistEnabled = Boolean(session.meetingId && session.backendToken);

  const api: AxiosInstance | null = useMemo(() => {
    if (!session.backendToken) return null;
    return makeApiClient(session.backendToken);
  }, [session.backendToken]);

  // Fetch history on mount + poll every 10s for agent messages
  useEffect(() => {
    if (!persistEnabled || !api || !session.meetingId) return;

    let cancelled = false;
    const fetchHistory = async () => {
      try {
        const msgs = await listMeetingMessages(api, session.meetingId!);
        if (!cancelled) setHistory(msgs);
      } catch {
        /* silent — connection issues shouldn't kill the UI */
      }
    };

    setHistoryLoading(true);
    void fetchHistory().finally(() => {
      if (!cancelled) setHistoryLoading(false);
    });

    const id = setInterval(fetchHistory, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [api, persistEnabled, session.meetingId]);

  // Merge history + live messages into one sorted, deduped stream.
  //
  // Dedup key = sender|content|timestamp-bucket(10s). This handles the common case
  // where the SAME message arrives from two sources:
  //   1. LK live (via useChat, immediate echo on send / peer publish)
  //   2. Backend history (via POST + later poll)
  // Both sources give us the same text from the same sender within a few seconds of
  // each other — we want to show it once. The 10-second bucket is generous enough
  // to absorb clock skew between client and server.
  const items = useMemo<ChatItem[]>(() => {
    const byKey = new Map<string, ChatItem>();
    const makeKey = (sender: string, content: string, ts: number) =>
      `${sender}|${content.trim()}|${Math.floor(ts / 10000)}`;

    // History first — it has stable UUIDs we want to preserve as the React key.
    for (const m of history) {
      const senderName =
        m.sender_name ?? (m.sender_type === 'ai_agent' ? 'AI Agent' : 'Unknown');
      const ts = m.created_at ? new Date(m.created_at).getTime() : 0;
      const key = makeKey(senderName, m.content, ts);
      byKey.set(key, {
        id: m.meeting_message_id,
        content: m.content,
        senderName,
        senderType: m.sender_type,
        isLocal: m.sender_id === localParticipant.identity,
        timestamp: ts,
      });
    }

    // LK live — skip if history already has a matching entry.
    for (const m of chatMessages) {
      const senderName = m.from?.name || m.from?.identity || 'Participant';
      const key = makeKey(senderName, m.message, m.timestamp);
      if (byKey.has(key)) continue;
      byKey.set(key, {
        id: `lk-${m.id}`,
        content: m.message,
        senderName,
        senderType: 'human',
        isLocal: m.from?.isLocal ?? false,
        timestamp: m.timestamp,
      });
    }

    return Array.from(byKey.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [history, chatMessages, localParticipant.identity]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [items.length]);

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSendError(null);

    // 1) Publish to LK data channel for immediate delivery to participants + agent
    try {
      await send(trimmed);
    } catch (e) {
      setSendError('Failed to send message over the room.');
      return;
    }

    // 2) Persist to backend (optional)
    if (persistEnabled && api && session.meetingId) {
      try {
        const saved = await sendMeetingMessage(api, session.meetingId, trimmed);
        setHistory((prev) => [...prev, saved]);
      } catch {
        setSendError('Message sent to the room but not saved to history.');
      }
    }
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between border-b border-[#262626] px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-white">In-meeting chat</h3>
          <p className="mt-0.5 text-xs text-[#737373]">
            {persistEnabled ? 'Live + saved to history' : 'Live only (no backend creds)'}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close chat"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#a3a3a3] hover:bg-[#1a1a1a] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
        {historyLoading && items.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-[#525252]" />
          </div>
        )}

        {!historyLoading && items.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1a1a1a]">
              <Bot className="h-5 w-5 text-[#525252]" />
            </div>
            <p className="mt-3 text-sm text-[#a3a3a3]">No messages yet</p>
            <p className="mt-1 text-xs text-[#525252]">Say hi to get the conversation going.</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {items.map((item) => (
            <ChatBubble key={item.id} item={item} />
          ))}
        </AnimatePresence>
      </div>

      <ChatInputBar onSend={handleSend} disabled={isSending} />

      {sendError && (
        <div className="flex items-center gap-2 border-t border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-300">
          <AlertCircle className="h-3.5 w-3.5" />
          {sendError}
        </div>
      )}
    </div>
  );
}

function ChatBubble({ item }: { item: ChatItem }) {
  const isAgent = item.senderType === 'ai_agent';
  const alignRight = item.isLocal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('mb-3 flex gap-2', alignRight ? 'flex-row-reverse' : 'flex-row')}
    >
      <div
        className={cn(
          'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full',
          isAgent
            ? 'bg-[#10b981]/15 text-[#10b981] ring-1 ring-[#10b981]/30'
            : alignRight
              ? 'bg-[#3b82f6]/15 text-[#60a5fa] ring-1 ring-[#3b82f6]/30'
              : 'bg-[#1a1a1a] text-[#a3a3a3]'
        )}
      >
        {isAgent ? <Bot className="h-3.5 w-3.5" /> : <UserIcon className="h-3.5 w-3.5" />}
      </div>

      <div className={cn('max-w-[78%]', alignRight && 'items-end')}>
        <div
          className={cn(
            'flex items-baseline gap-2 text-xs',
            alignRight ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          <span className="font-medium text-white">{item.senderName}</span>
          {isAgent && (
            <span className="rounded-full bg-[#10b981]/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#10b981]">
              AI
            </span>
          )}
          {item.timestamp > 0 && (
            <span className="text-[10px] text-[#525252]">{formatTime(item.timestamp)}</span>
          )}
        </div>

        <div
          className={cn(
            'mt-1 rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
            alignRight
              ? 'bg-[#10b981]/15 text-white rounded-tr-sm'
              : isAgent
                ? 'bg-[#10b981]/5 text-white border border-[#10b981]/20 rounded-tl-sm'
                : 'bg-[#1a1a1a] text-white rounded-tl-sm'
          )}
        >
          {item.content}
        </div>
      </div>
    </motion.div>
  );
}

function ChatInputBar({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void | Promise<void>;
  disabled?: boolean;
}) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || disabled) return;
    const value = text;
    setText('');
    await onSend(value);
    textareaRef.current?.focus();
  };

  return (
    <form onSubmit={submit} className="border-t border-[#262626] p-3">
      <div className="flex items-end gap-2 rounded-xl border border-[#262626] bg-[#141414] p-2 focus-within:border-[#10b981]/50">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder="Send a message…"
          rows={1}
          className="min-h-[36px] max-h-32 resize-none border-0 bg-transparent p-2 focus:ring-0"
        />
        <button
          type="submit"
          disabled={!text.trim() || disabled}
          className={cn(
            'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors',
            text.trim() && !disabled
              ? 'bg-[#10b981] text-white hover:bg-[#059669]'
              : 'bg-[#1a1a1a] text-[#525252] cursor-not-allowed'
          )}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
