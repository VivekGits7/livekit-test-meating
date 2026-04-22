import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  X,
  Loader2,
  Calendar,
  Clock,
  Users,
  FileText,
  Hash,
  Video,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getMeetingDetail, makeApiClient } from '@/lib/api';
import type { MeetingDetail, ParticipantSummary } from '@/lib/api';

interface MeetingDetailModalProps {
  open: boolean;
  onClose: () => void;
  meetingId: string | null;
  token: string;
  onJoin: (meetingId: string) => void;
  joinDisabled?: boolean;
}

const JOINABLE_STATUSES = new Set(['proposed', 'scheduled', 'active']);

export default function MeetingDetailModal({
  open,
  onClose,
  meetingId,
  token,
  onJoin,
  joinDisabled = false,
}: MeetingDetailModalProps) {
  const client = useMemo(() => makeApiClient(token), [token]);
  const reducedMotion = useReducedMotion();

  const [detail, setDetail] = useState<MeetingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const d = await getMeetingDetail(client, id);
        setDetail(d);
      } catch (err) {
        setError(extractErrorMessage(err, 'Failed to load meeting details.'));
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  useEffect(() => {
    if (open && meetingId) void load(meetingId);
    if (!open) {
      setDetail(null);
      setError(null);
    }
  }, [open, meetingId, load]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const backdrop = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };

  const panel = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 20, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 20, scale: 0.98 },
      };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="mdm-backdrop"
            {...backdrop}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            key="mdm-panel"
            {...panel}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="meeting-detail-heading"
              className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#262626] bg-[#141414] shadow-2xl"
            >
              <header className="flex items-center justify-between border-b border-[#262626] px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#10b981]/15 ring-1 ring-[#10b981]/30">
                    <Video className="h-4 w-4 text-[#10b981]" aria-hidden="true" />
                  </div>
                  <div>
                    <h2
                      id="meeting-detail-heading"
                      className="text-sm font-semibold text-white"
                    >
                      {detail?.title ?? 'Meeting details'}
                    </h2>
                    <p className="text-xs text-[#737373]">
                      {detail
                        ? `${detail.meeting_type.replace(/_/g, ' ')} · sequence #${detail.sequence_number}`
                        : 'Loading…'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close meeting details"
                  className="cursor-pointer rounded-md p-2 text-[#737373] hover:bg-[#1a1a1a] hover:text-white"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto">
                {loading && <DetailSkeleton />}
                {error && !loading && (
                  <div className="p-6">
                    <div
                      role="alert"
                      className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                    >
                      {error}
                    </div>
                  </div>
                )}
                {detail && !loading && !error && <DetailBody detail={detail} />}
              </div>

              <footer className="flex items-center justify-between gap-3 border-t border-[#262626] bg-[#0f0f0f] px-6 py-3">
                <div className="text-xs text-[#737373]">
                  {detail && (
                    <>
                      <Hash
                        className="mr-1 inline h-3 w-3"
                        aria-hidden="true"
                      />
                      <span className="font-mono">{detail.meeting_id.slice(0, 8)}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    Close
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => detail && onJoin(detail.meeting_id)}
                    disabled={
                      !detail ||
                      joinDisabled ||
                      !JOINABLE_STATUSES.has(detail.status)
                    }
                    aria-label={
                      detail && JOINABLE_STATUSES.has(detail.status)
                        ? `Join ${detail.title}`
                        : 'Not joinable'
                    }
                  >
                    {detail && JOINABLE_STATUSES.has(detail.status) ? (
                      <>
                        <Video className="h-3.5 w-3.5" aria-hidden="true" />
                        Join meeting
                      </>
                    ) : (
                      <span className="capitalize">{detail?.status ?? 'Unavailable'}</span>
                    )}
                  </Button>
                </div>
              </footer>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function DetailBody({ detail }: { detail: MeetingDetail }) {
  return (
    <div className="space-y-5 px-6 py-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InfoCell
          icon={<Calendar className="h-3.5 w-3.5" aria-hidden="true" />}
          label="Scheduled"
          value={formatWhen(detail.scheduled_at)}
        />
        <InfoCell
          icon={<Clock className="h-3.5 w-3.5" aria-hidden="true" />}
          label="Duration"
          value={
            detail.duration_minutes
              ? `${detail.duration_minutes} minutes`
              : 'Not set'
          }
        />
        <InfoCell
          icon={<Target className="h-3.5 w-3.5" aria-hidden="true" />}
          label="Status"
          value={<span className="capitalize">{detail.status}</span>}
        />
        <InfoCell
          icon={<Users className="h-3.5 w-3.5" aria-hidden="true" />}
          label="Roster"
          value={`${detail.participants.length} participant${detail.participants.length === 1 ? '' : 's'}`}
        />
      </div>

      {detail.agenda && (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[#a3a3a3]">
            <FileText className="h-3 w-3" aria-hidden="true" />
            Agenda
          </h3>
          <div className="whitespace-pre-wrap rounded-lg border border-[#262626] bg-[#0f0f0f] p-3 text-sm text-[#d4d4d4]">
            {detail.agenda}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[#a3a3a3]">
          <Users className="h-3 w-3" aria-hidden="true" />
          Participants
        </h3>
        {detail.participants.length === 0 ? (
          <p className="text-xs text-[#737373]">No participants added yet.</p>
        ) : (
          <ul className="space-y-2">
            {detail.participants.map((p) => (
              <ParticipantRow key={p.participant_id} p={p} />
            ))}
          </ul>
        )}
      </section>

      {detail.has_report && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          A post-meeting report has been generated for this meeting.
        </div>
      )}
    </div>
  );
}

function ParticipantRow({ p }: { p: ParticipantSummary }) {
  const priorityColors: Record<string, string> = {
    high: 'text-amber-300',
    medium: 'text-[#a3a3a3]',
    low: 'text-[#525252]',
  };
  const pCls = priorityColors[p.priority ?? 'medium'] ?? priorityColors.medium;

  return (
    <li className="flex items-start gap-3 rounded-lg border border-[#262626] bg-[#0f0f0f] p-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/15 ring-1 ring-blue-500/30">
        <span className="text-[11px] font-semibold text-blue-300">
          {initials(p.display_name)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-white">
            {p.display_name || 'Unknown'}
          </span>
          <span className={`text-[10px] font-medium uppercase tracking-wide ${pCls}`}>
            {p.priority ?? 'medium'}
          </span>
        </div>
        {p.role && <p className="text-xs text-[#a3a3a3]">{p.role}</p>}
        {p.responsibilities && (
          <p className="mt-1 line-clamp-2 text-[11px] text-[#737373]">{p.responsibilities}</p>
        )}
        {p.discussion_points && p.discussion_points.length > 0 && (
          <ul className="mt-1.5 space-y-0.5 pl-3 text-[11px] text-[#737373] list-disc list-inside">
            {p.discussion_points.slice(0, 3).map((pt, i) => (
              <li key={i}>{pt}</li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

function InfoCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[#262626] bg-[#0f0f0f] px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-[#737373]">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-sm text-white">{value}</div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-5 px-6 py-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-[#262626] bg-[#0f0f0f] p-3">
            <Skeleton className="mb-2 h-3 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
      <Skeleton className="h-20 w-full" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-[#262626] bg-[#0f0f0f] p-3"
          >
            <Skeleton className="h-8 w-8 flex-shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
