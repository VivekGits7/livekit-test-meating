import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Inbox,
  X,
  Loader2,
  Mail,
  MailOpen,
  CheckCircle2,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  Hash,
  Bot,
  User as UserIcon,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getInbox,
  makeApiClient,
  markMessageRead,
  voteOnMeetingInvite,
} from '@/lib/api';
import type { MessageData } from '@/lib/api';

interface InboxPanelProps {
  open: boolean;
  onClose: () => void;
  token: string;
  onUnreadCountChange?: (unread: number) => void;
}

export default function InboxPanel({
  open,
  onClose,
  token,
  onUnreadCountChange,
}: InboxPanelProps) {
  const client = useMemo(() => makeApiClient(token), [token]);
  const reducedMotion = useReducedMotion();

  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const resp = await getInbox(client, { limit: 50 });
        setMessages(resp.messages);
        onUnreadCountChange?.(resp.unread_count);
      } catch (err) {
        setError(extractErrorMessage(err, 'Failed to load inbox.'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [client, onUnreadCountChange]
  );

  // Load when panel opens
  useEffect(() => {
    if (open) void load(false);
  }, [open, load]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleMessageClick = async (msg: MessageData) => {
    setExpandedId(expandedId === msg.meeting_message_id ? null : msg.meeting_message_id);

    // Mark read if unread (best-effort, don't block UI)
    if (!msg.read_at) {
      try {
        await markMessageRead(client, msg.meeting_message_id);
        setMessages((prev) =>
          prev.map((m) =>
            m.meeting_message_id === msg.meeting_message_id
              ? { ...m, read_at: new Date().toISOString() }
              : m
          )
        );
        // Update unread count locally
        onUnreadCountChange?.(messages.filter((m) => !m.read_at).length - 1);
      } catch {
        // Non-fatal — user still sees the message
      }
    }
  };

  const handleVoteSuccess = async (messageId: string) => {
    // Refresh inbox after a successful vote — the backend fans out a vote_reply DM
    // to other participants, but the voter's own inbox just needs the read state.
    setExpandedId(null);
    await load(true);
  };

  const slideIn = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { x: '100%', opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: '100%', opacity: 0 },
      };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="inbox-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.aside
            key="inbox-panel"
            {...slideIn}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[#262626] bg-[#0f0f0f] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inbox-heading"
          >
            <header className="flex items-center justify-between border-b border-[#262626] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#10b981]/15 ring-1 ring-[#10b981]/30">
                  <Inbox className="h-4 w-4 text-[#10b981]" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="inbox-heading" className="text-sm font-semibold text-white">
                    Inbox
                  </h2>
                  <p className="text-xs text-[#737373]">
                    {messages.length > 0
                      ? `${messages.filter((m) => !m.read_at).length} unread of ${messages.length}`
                      : 'No messages'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => void load(true)}
                  disabled={refreshing || loading}
                  aria-label="Refresh inbox"
                  className="cursor-pointer rounded-md p-2 text-[#737373] hover:bg-[#1a1a1a] hover:text-white disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                </button>
                <button
                  onClick={onClose}
                  aria-label="Close inbox"
                  className="cursor-pointer rounded-md p-2 text-[#737373] hover:bg-[#1a1a1a] hover:text-white"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <InboxSkeleton />
              ) : error ? (
                <div className="p-5">
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <EmptyInbox />
              ) : (
                <ul className="divide-y divide-[#1a1a1a]">
                  {messages.map((msg) => (
                    <MessageRow
                      key={msg.meeting_message_id}
                      message={msg}
                      expanded={expandedId === msg.meeting_message_id}
                      onToggle={() => void handleMessageClick(msg)}
                      client={client}
                      onVoteSuccess={() => void handleVoteSuccess(msg.meeting_message_id)}
                      reducedMotion={!!reducedMotion}
                    />
                  ))}
                </ul>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function MessageRow({
  message,
  expanded,
  onToggle,
  client,
  onVoteSuccess,
  reducedMotion,
}: {
  message: MessageData;
  expanded: boolean;
  onToggle: () => void;
  client: ReturnType<typeof makeApiClient>;
  onVoteSuccess: () => void;
  reducedMotion: boolean;
}) {
  const unread = !message.read_at;
  const isVoteInvite = message.message_type === 'meeting_invite' && !!message.meeting_id;
  const sender = message.sender_name || (message.sender_type === 'ai_agent' ? 'CAPA AI' : 'Unknown');
  const isAI = message.sender_type === 'ai_agent';

  return (
    <li className={`transition-colors ${unread ? 'bg-[#10b981]/[0.03]' : ''}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-start gap-3 px-5 py-4 text-left hover:bg-[#141414]"
      >
        <div className="relative mt-0.5 flex-shrink-0">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ring-1 ${
              isAI
                ? 'bg-[#10b981]/15 ring-[#10b981]/30'
                : 'bg-blue-500/15 ring-blue-500/30'
            }`}
          >
            {isAI ? (
              <Bot className="h-4 w-4 text-[#10b981]" aria-hidden="true" />
            ) : (
              <UserIcon className="h-4 w-4 text-blue-400" aria-hidden="true" />
            )}
          </div>
          {unread && (
            <span
              className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#10b981] ring-2 ring-[#0f0f0f]"
              aria-label="Unread"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`truncate text-sm ${unread ? 'font-semibold text-white' : 'font-medium text-[#d4d4d4]'}`}
              >
                {sender}
              </span>
              <MessageTypePill type={message.message_type} />
            </div>
            <span className="flex-shrink-0 text-[10px] text-[#525252]">
              {formatRelative(message.created_at)}
            </span>
          </div>

          <p
            className={`mt-1 text-xs ${expanded ? 'whitespace-pre-wrap text-[#d4d4d4]' : 'line-clamp-2 text-[#a3a3a3]'}`}
          >
            {message.content}
          </p>

          {!expanded && isVoteInvite && (
            <div className="mt-1.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-[#10b981]">
              Tap to vote
              <ChevronRight className="h-2.5 w-2.5" aria-hidden="true" />
            </div>
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={reducedMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 px-5 pb-4">
              {isVoteInvite ? (
                <VotePanel
                  messageId={message.meeting_message_id}
                  client={client}
                  onSuccess={onVoteSuccess}
                />
              ) : (
                <div className="text-[10px] text-[#525252]">
                  {message.case_id && (
                    <span className="mr-3 inline-flex items-center gap-1">
                      <Hash className="h-3 w-3" aria-hidden="true" />
                      Case {message.case_id.slice(0, 8)}
                    </span>
                  )}
                  {message.meeting_id && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" aria-hidden="true" />
                      Meeting {message.meeting_id.slice(0, 8)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function VotePanel({
  messageId,
  client,
  onSuccess,
}: {
  messageId: string;
  client: ReturnType<typeof makeApiClient>;
  onSuccess: () => void;
}) {
  const [decision, setDecision] = useState<'yes' | 'no' | null>(null);
  const [suggestionText, setSuggestionText] = useState('');
  const [suggestedTime, setSuggestedTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ finalized: boolean } | null>(null);

  const submit = async () => {
    if (!decision) return;
    setError(null);

    if (decision === 'no' && !suggestionText.trim()) {
      setError('Voting NO requires a reason — please explain your suggestion.');
      return;
    }

    setLoading(true);
    try {
      const resp = await voteOnMeetingInvite(client, messageId, {
        decision,
        suggestion_text: suggestionText.trim() || undefined,
        suggested_time:
          decision === 'no' && suggestedTime ? new Date(suggestedTime).toISOString() : undefined,
      });
      setDone({ finalized: resp.finalized });
      setTimeout(() => onSuccess(), 1200);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to record your vote.'));
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          <span className="font-semibold">Vote recorded</span>
        </div>
        <p className="mt-1 text-emerald-300/80">
          {done.finalized
            ? 'Your vote closed the poll — the meeting is now scheduled.'
            : 'Waiting for the rest of the roster to vote.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-[#262626] bg-[#141414] p-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setDecision('yes')}
          disabled={loading}
          aria-pressed={decision === 'yes'}
          className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
            decision === 'yes'
              ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
              : 'border-[#262626] bg-[#0f0f0f] text-[#a3a3a3] hover:border-emerald-500/30 hover:text-white'
          }`}
        >
          <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
          Yes, works for me
        </button>
        <button
          type="button"
          onClick={() => setDecision('no')}
          disabled={loading}
          aria-pressed={decision === 'no'}
          className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
            decision === 'no'
              ? 'border-red-500/50 bg-red-500/15 text-red-300'
              : 'border-[#262626] bg-[#0f0f0f] text-[#a3a3a3] hover:border-red-500/30 hover:text-white'
          }`}
        >
          <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
          No, different time
        </button>
      </div>

      {decision !== null && (
        <div className="space-y-2">
          {decision === 'no' && (
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-[#a3a3a3]">
                Alternative time
              </span>
              <input
                type="datetime-local"
                value={suggestedTime}
                onChange={(e) => setSuggestedTime(e.target.value)}
                disabled={loading}
                className="h-9 w-full rounded-md border border-[#262626] bg-[#0f0f0f] px-2 text-xs text-white focus:border-[#10b981] focus:outline-none"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-[#a3a3a3]">
              {decision === 'no' ? 'Reason (required)' : 'Note (optional)'}
            </span>
            <Textarea
              rows={2}
              value={suggestionText}
              onChange={(e) => setSuggestionText(e.target.value)}
              placeholder={
                decision === 'no'
                  ? 'Why this time doesn\'t work + what you\'d prefer…'
                  : 'Optional — anything you want the team to know'
              }
              disabled={loading}
              className="text-xs"
            />
          </label>

          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDecision(null);
                setSuggestionText('');
                setSuggestedTime('');
                setError(null);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={() => void submit()} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  Submitting…
                </>
              ) : (
                'Submit vote'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageTypePill({ type }: { type: string }) {
  const labels: Record<string, { label: string; cls: string }> = {
    meeting_invite: {
      label: 'Vote',
      cls: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
    },
    vote_reply: {
      label: 'Reply',
      cls: 'bg-blue-500/15 text-blue-300 ring-blue-500/30',
    },
    action_item: {
      label: 'Action',
      cls: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    },
    reminder: {
      label: 'Reminder',
      cls: 'bg-orange-500/15 text-orange-300 ring-orange-500/30',
    },
    general: { label: 'Message', cls: 'bg-neutral-500/15 text-neutral-300 ring-neutral-500/30' },
    question: { label: 'Question', cls: 'bg-purple-500/15 text-purple-300 ring-purple-500/30' },
    status_update: {
      label: 'Update',
      cls: 'bg-cyan-500/15 text-cyan-300 ring-cyan-500/30',
    },
  };
  const { label, cls } = labels[type] ?? labels.general;
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ring-1 ${cls}`}
    >
      {label}
    </span>
  );
}

function InboxSkeleton() {
  return (
    <ul className="divide-y divide-[#1a1a1a]" aria-label="Loading inbox">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="flex items-start gap-3 px-5 py-4">
          <Skeleton className="h-8 w-8 flex-shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-2 w-12" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyInbox() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1a1a1a] ring-1 ring-[#262626]">
        <MailOpen className="h-6 w-6 text-[#737373]" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-white">Inbox is empty</h3>
      <p className="mx-auto mt-1 max-w-xs text-xs text-[#a3a3a3]">
        Vote requests, meeting confirmations, and action-item notifications will show up here.
      </p>
    </div>
  );
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function extractErrorMessage(err: unknown, fallback: string): string {
  type ApiError = { response?: { data?: { error?: { message?: string }; detail?: string } } };
  const e = err as ApiError;
  const msg =
    e?.response?.data?.error?.message ??
    e?.response?.data?.detail ??
    (err instanceof Error ? err.message : undefined);
  return typeof msg === 'string' && msg.trim() ? msg : fallback;
}

// Suppress unused import warning when Mail icon isn't used directly
void Mail;
