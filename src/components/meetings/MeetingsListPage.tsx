import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Video,
  LogOut,
  Loader2,
  Calendar,
  Users,
  RefreshCw,
  ArrowRight,
  Hash,
  CalendarPlus,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import InboxPanel from '@/components/inbox/InboxPanel';
import { getUnreadCount, joinMeeting, listMeetings, makeApiClient } from '@/lib/api';
import type { AuthUser, MeetingSummary } from '@/lib/api';
import type { JoinSession } from '@/types/session';

interface MeetingsListPageProps {
  token: string;
  user: AuthUser;
  onJoin: (session: JoinSession) => void;
  onLogout: () => void;
}

const JOINABLE_STATUSES = new Set(['proposed', 'scheduled', 'active']);

export default function MeetingsListPage({
  token,
  user,
  onJoin,
  onLogout,
}: MeetingsListPageProps) {
  const client = useMemo(() => makeApiClient(token), [token]);
  const reducedMotion = useReducedMotion();
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const pollRef = useRef<number | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const { meetings: items, total: count } = await listMeetings(client, { limit: 50 });
        setMeetings(items);
        setTotal(count);
      } catch (err) {
        const msg = extractErrorMessage(err, 'Failed to load meetings.');
        setError(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [client]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  // Poll unread count every 30s so the bell badge stays fresh without a hard reload.
  useEffect(() => {
    let cancelled = false;
    const fetchUnread = async () => {
      try {
        const count = await getUnreadCount(client);
        if (!cancelled) setUnreadCount(count);
      } catch {
        // Non-fatal — badge just stays stale
      }
    };
    void fetchUnread();
    pollRef.current = window.setInterval(() => void fetchUnread(), 30_000);
    return () => {
      cancelled = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [client]);

  const handleJoin = async (meeting: MeetingSummary) => {
    setJoining(meeting.meeting_id);
    setError(null);
    try {
      const data = await joinMeeting(client, meeting.meeting_id);
      onJoin({
        liveKitUrl: data.livekit_url,
        token: data.token,
        meetingId: data.meeting_id,
        backendToken: token,
        displayName: data.participant_display_name || user.full_name || 'You',
      });
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to join meeting.'));
      setJoining(null);
    }
  };

  const fadeIn = reducedMotion
    ? { initial: false, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

  return (
    <main
      className="relative h-full w-full overflow-y-auto"
      aria-labelledby="page-heading"
    >
      {!reducedMotion && (
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(circle at 20% 10%, rgba(16,185,129,0.18), transparent 50%), radial-gradient(circle at 80% 90%, rgba(59,130,246,0.12), transparent 50%)',
          }}
          aria-hidden="true"
        />
      )}

      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.header
          {...fadeIn}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#10b981]/15 ring-1 ring-[#10b981]/30">
              <Video className="h-5 w-5 text-[#10b981]" aria-hidden="true" />
            </div>
            <div>
              <h1
                id="page-heading"
                className="text-xl font-bold tracking-tight text-white"
              >
                Your meetings
              </h1>
              <p className="text-xs text-[#737373]">
                Signed in as <span className="text-[#d4d4d4]">{user.full_name}</span>
                <span className="mx-1.5 text-[#404040]">·</span>
                <span className="text-[#a3a3a3]">{user.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setInboxOpen(true)}
              className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[#262626] bg-[#141414] text-[#a3a3a3] transition-colors hover:border-[#10b981]/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10b981]/40"
              aria-label={
                unreadCount > 0
                  ? `Inbox (${unreadCount} unread)`
                  : 'Inbox'
              }
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              {unreadCount > 0 && (
                <span
                  className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#10b981] px-1 text-[9px] font-bold text-black ring-2 ring-[#0a0a0a]"
                  aria-hidden="true"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => void load(true)}
              disabled={refreshing || loading}
              aria-label="Refresh meetings list"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              aria-label="Sign out of your account"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Sign out
            </Button>
          </div>
        </motion.header>

        <div aria-live="polite" aria-atomic="true">
          {error && (
            <motion.div
              role="alert"
              initial={reducedMotion ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </motion.div>
          )}
        </div>

        <section className="mt-6" aria-label="Meeting list">
          {loading ? (
            <MeetingListSkeleton />
          ) : meetings.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <p className="mb-3 text-xs text-[#737373]">
                {total} meeting{total === 1 ? '' : 's'} visible to you
              </p>
              <ul className="space-y-3">
                <AnimatePresence>
                  {meetings.map((m, idx) => (
                    <MeetingCard
                      key={m.meeting_id}
                      meeting={m}
                      index={idx}
                      isJoining={joining === m.meeting_id}
                      disableAllJoins={joining !== null}
                      reducedMotion={!!reducedMotion}
                      onJoin={() => void handleJoin(m)}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </>
          )}
        </section>
      </div>

      <InboxPanel
        open={inboxOpen}
        onClose={() => {
          setInboxOpen(false);
          // Someone may have just voted — refresh the list so newly-scheduled meetings appear.
          void load(true);
        }}
        token={token}
        onUnreadCountChange={setUnreadCount}
      />
    </main>
  );
}

function MeetingListSkeleton() {
  return (
    <ul className="space-y-3" aria-label="Loading meetings">
      <li className="sr-only">Loading your meetings</li>
      {Array.from({ length: 3 }).map((_, i) => (
        <li
          key={i}
          className="flex items-center justify-between gap-4 rounded-xl border border-[#262626] bg-[#141414]/80 p-4"
        >
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-5 w-64" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-9 w-20" />
        </li>
      ))}
    </ul>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-[#262626] bg-[#141414]/80 px-6 py-16 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1a1a1a] ring-1 ring-[#262626]">
        <CalendarPlus className="h-6 w-6 text-[#737373]" aria-hidden="true" />
      </div>
      <h2 className="text-base font-semibold text-white">No meetings yet</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-[#a3a3a3]">
        You'll see meetings here once a CAPA is assigned or someone adds you as a participant.
      </p>
      <p className="mt-4 text-xs text-[#525252]">
        New meetings typically arrive as a DM — keep an eye on your inbox.
      </p>
    </div>
  );
}

function MeetingCard({
  meeting,
  index,
  isJoining,
  disableAllJoins,
  reducedMotion,
  onJoin,
}: {
  meeting: MeetingSummary;
  index: number;
  isJoining: boolean;
  disableAllJoins: boolean;
  reducedMotion: boolean;
  onJoin: () => void;
}) {
  const joinable = JOINABLE_STATUSES.has(meeting.status);
  const typeLabel = meeting.meeting_type.replace(/_/g, ' ');

  return (
    <motion.li
      layout={!reducedMotion}
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
      transition={{ duration: 0.25, delay: reducedMotion ? 0 : index * 0.03 }}
      className="flex flex-col gap-3 rounded-xl border border-[#262626] bg-[#141414]/80 p-4 backdrop-blur-xl transition-colors hover:border-[#333333] sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={meeting.status} />
          <span className="text-[10px] uppercase tracking-widest text-[#525252]">
            {typeLabel} · #{meeting.sequence_number}
          </span>
        </div>
        <h3
          className="mt-1.5 truncate text-sm font-semibold text-white"
          title={meeting.title}
        >
          {meeting.title}
        </h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#737373]">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            {formatWhen(meeting.scheduled_at)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" aria-hidden="true" />
            {meeting.participant_count} participant
            {meeting.participant_count === 1 ? '' : 's'}
          </span>
          <span className="flex items-center gap-1 text-[#525252]">
            <Hash className="h-3 w-3" aria-hidden="true" />
            {meeting.meeting_id.slice(0, 8)}
          </span>
        </div>
      </div>

      <Button
        variant={joinable ? 'primary' : 'ghost'}
        size="sm"
        onClick={onJoin}
        disabled={!joinable || disableAllJoins}
        aria-label={joinable ? `Join ${meeting.title}` : `${meeting.title} is ${meeting.status}`}
      >
        {isJoining ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Joining…
          </>
        ) : joinable ? (
          <>
            Join
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </>
        ) : (
          <span className="capitalize">{meeting.status}</span>
        )}
      </Button>
    </motion.li>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    proposed: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
    scheduled: 'bg-blue-500/15 text-blue-300 ring-blue-500/30',
    active: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    completed: 'bg-neutral-500/15 text-neutral-300 ring-neutral-500/30',
    cancelled: 'bg-red-500/15 text-red-300 ring-red-500/30',
    failed: 'bg-red-500/15 text-red-300 ring-red-500/30',
  };
  const cls = colors[status] ?? 'bg-neutral-500/15 text-neutral-300 ring-neutral-500/30';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ${cls}`}
    >
      {status}
    </span>
  );
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return 'Not scheduled';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
