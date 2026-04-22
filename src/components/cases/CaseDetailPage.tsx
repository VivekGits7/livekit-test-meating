import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Shield,
  Activity,
  Calendar,
  Users,
  RefreshCw,
  Info,
  Hash,
  Video,
  ChevronRight,
  Stethoscope,
  MapPin,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import MeetingDetailModal from '@/components/meetings/MeetingDetailModal';
import CaseActionsBar from '@/components/cases/CaseActionsBar';
import {
  deleteMeeting,
  getCaseDetail,
  joinMeeting,
  listMeetings,
  makeApiClient,
} from '@/lib/api';
import type {
  AuthUser,
  CaseData,
  MeetingSummary,
} from '@/lib/api';
import type { JoinSession } from '@/types/session';

interface CaseDetailPageProps {
  token: string;
  user: AuthUser;
  caseId: string;
  onBack: () => void;
  onJoin: (session: JoinSession) => void;
}

const JOINABLE_STATUSES = new Set(['proposed', 'scheduled', 'active']);

export default function CaseDetailPage({
  token,
  user,
  caseId,
  onBack,
  onJoin,
}: CaseDetailPageProps) {
  const client = useMemo(() => makeApiClient(token), [token]);
  const reducedMotion = useReducedMotion();

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailMeetingId, setDetailMeetingId] = useState<string | null>(null);
  const [cancelMeetingId, setCancelMeetingId] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const [c, { meetings: items }] = await Promise.all([
          getCaseDetail(client, caseId),
          listMeetings(client, { case_id: caseId, limit: 50 }),
        ]);
        setCaseData(c);
        setMeetings(items);
      } catch (err) {
        setError(extractErrorMessage(err, 'Failed to load case.'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [client, caseId]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const handleJoin = async (meetingId: string) => {
    setJoining(meetingId);
    setError(null);
    setDetailMeetingId(null);
    try {
      const data = await joinMeeting(client, meetingId);
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

  const handleCancelMeeting = async () => {
    if (!cancelMeetingId) return;
    setCanceling(true);
    setError(null);
    try {
      await deleteMeeting(client, cancelMeetingId);
      setCancelMeetingId(null);
      await load(true);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to cancel meeting.'));
    } finally {
      setCanceling(false);
    }
  };

  const fadeIn = reducedMotion
    ? { initial: false, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

  return (
    <main className="relative h-full w-full overflow-y-auto">
      {!reducedMotion && (
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              'radial-gradient(circle at 20% 10%, rgba(16,185,129,0.12), transparent 50%), radial-gradient(circle at 80% 90%, rgba(59,130,246,0.08), transparent 50%)',
          }}
          aria-hidden="true"
        />
      )}

      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          {...fadeIn}
          transition={{ duration: 0.35 }}
          className="flex items-center justify-between"
        >
          <button
            onClick={onBack}
            className="group flex cursor-pointer items-center gap-1.5 text-sm text-[#a3a3a3] transition-colors hover:text-white focus-visible:outline-none focus-visible:text-white"
          >
            <ArrowLeft
              className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
              aria-hidden="true"
            />
            Back to cases
          </button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => void load(true)}
            disabled={refreshing || loading}
            aria-label="Refresh case and meetings"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            Refresh
          </Button>
        </motion.div>

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

        {loading ? (
          <CaseDetailSkeleton />
        ) : caseData ? (
          <>
            <div className="mt-5">
              <CaseActionsBar
                token={token}
                caseData={caseData}
                onStatusChanged={() => void load(true)}
                onCaseDeleted={onBack}
              />
            </div>
            <CaseInfoCard caseData={caseData} />

            <section className="mt-8" aria-label="CAPA meetings for this case">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#a3a3a3]">
                  <Video className="h-4 w-4" aria-hidden="true" />
                  CAPA meetings
                </h2>
                <span className="text-xs text-[#525252]">
                  {meetings.length} meeting{meetings.length === 1 ? '' : 's'}
                </span>
              </div>

              {meetings.length === 0 ? (
                <div className="rounded-xl border border-[#262626] bg-[#141414]/80 px-6 py-10 text-center">
                  <Calendar
                    className="mx-auto mb-2 h-5 w-5 text-[#525252]"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-[#a3a3a3]">
                    No meetings scheduled for this case yet.
                  </p>
                  <p className="mt-1 text-xs text-[#525252]">
                    The first meeting is auto-proposed when a case is assigned to CAPA.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  <AnimatePresence>
                    {meetings.map((m, idx) => (
                      <MeetingRow
                        key={m.meeting_id}
                        meeting={m}
                        index={idx}
                        reducedMotion={!!reducedMotion}
                        isJoining={joining === m.meeting_id}
                        disableAllJoins={joining !== null}
                        onViewDetails={() => setDetailMeetingId(m.meeting_id)}
                        onJoin={() => void handleJoin(m.meeting_id)}
                        onCancel={() => setCancelMeetingId(m.meeting_id)}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </section>
          </>
        ) : null}
      </div>

      <MeetingDetailModal
        open={detailMeetingId !== null}
        onClose={() => setDetailMeetingId(null)}
        meetingId={detailMeetingId}
        token={token}
        onJoin={(id) => void handleJoin(id)}
        joinDisabled={joining !== null}
      />

      <ConfirmDialog
        open={cancelMeetingId !== null}
        onClose={() => (canceling ? undefined : setCancelMeetingId(null))}
        onConfirm={handleCancelMeeting}
        title="Cancel this meeting?"
        description="The LiveKit room will be torn down and participants will be notified. This only works for meetings in the `scheduled` status."
        confirmLabel="Cancel meeting"
        confirmVariant="danger"
      />
    </main>
  );
}

function CaseInfoCard({ caseData }: { caseData: CaseData }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="mt-6 overflow-hidden rounded-2xl border border-[#262626] bg-[#141414]/80 backdrop-blur-xl"
    >
      <header className="border-b border-[#262626] px-6 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-bold text-[#10b981]">
            {caseData.case_number}
          </span>
          <StatusPill status={caseData.status} />
          <SeverityPill severity={caseData.severity} />
          {caseData.regulatory_reportable && <ReportableBadge />}
          {caseData.current_phase && <PhasePill phase={caseData.current_phase} />}
        </div>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-white">
          {caseData.device_name}
          {caseData.device_model && (
            <span className="ml-2 text-sm font-normal text-[#737373]">
              · {caseData.device_model}
            </span>
          )}
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">
        <InfoRow
          icon={<Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />}
          label="Category"
          value={<span className="capitalize">{caseData.category.replace(/_/g, ' ')}</span>}
        />
        <InfoRow
          icon={<Activity className="h-3.5 w-3.5" aria-hidden="true" />}
          label="Patient impact"
          value={<span className="capitalize">{caseData.patient_impact}</span>}
        />
        {caseData.incident_date && (
          <InfoRow
            icon={<Calendar className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Incident date"
            value={formatDate(caseData.incident_date)}
          />
        )}
        {caseData.incident_location && (
          <InfoRow
            icon={<MapPin className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Location"
            value={caseData.incident_location}
          />
        )}
        {caseData.batch_number && (
          <InfoRow
            icon={<Hash className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Batch"
            value={<span className="font-mono">{caseData.batch_number}</span>}
          />
        )}
        {caseData.serial_number && (
          <InfoRow
            icon={<Hash className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Serial"
            value={<span className="font-mono">{caseData.serial_number}</span>}
          />
        )}
        {caseData.reporter_name && (
          <InfoRow
            icon={<UserIcon className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Reporter"
            value={caseData.reporter_name}
          />
        )}
        {caseData.reporter_role && (
          <InfoRow
            icon={<UserIcon className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Role"
            value={caseData.reporter_role}
          />
        )}
      </div>

      <div className="border-t border-[#262626] px-6 py-5">
        <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-[#737373]">
          <Info className="h-3 w-3" aria-hidden="true" />
          Description
        </h3>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#d4d4d4]">
          {caseData.description}
        </p>
      </div>

      {caseData.injury_description && (
        <div className="border-t border-[#262626] bg-red-500/[0.03] px-6 py-5">
          <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-red-300">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            Injury description
          </h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#e5e5e5]">
            {caseData.injury_description}
          </p>
        </div>
      )}

      {caseData.regulatory_reportable && caseData.reportable_justification && (
        <div className="border-t border-[#262626] bg-purple-500/[0.03] px-6 py-5">
          <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-purple-300">
            <Shield className="h-3 w-3" aria-hidden="true" />
            Reportable justification
          </h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#d4d4d4]">
            {caseData.reportable_justification}
          </p>
        </div>
      )}
    </motion.article>
  );
}

function MeetingRow({
  meeting,
  index,
  reducedMotion,
  isJoining,
  disableAllJoins,
  onViewDetails,
  onJoin,
  onCancel,
}: {
  meeting: MeetingSummary;
  index: number;
  reducedMotion: boolean;
  isJoining: boolean;
  disableAllJoins: boolean;
  onViewDetails: () => void;
  onJoin: () => void;
  onCancel: () => void;
}) {
  const joinable = JOINABLE_STATUSES.has(meeting.status);
  const cancelable = meeting.status === 'scheduled';
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
          <MeetingStatusPill status={meeting.status} />
          <span className="text-[10px] uppercase tracking-widest text-[#525252]">
            {meeting.meeting_type.replace(/_/g, ' ')} · #{meeting.sequence_number}
          </span>
        </div>
        <h3 className="mt-1.5 truncate text-sm font-semibold text-white" title={meeting.title}>
          {meeting.title}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#737373]">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            {formatWhen(meeting.scheduled_at)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" aria-hidden="true" />
            {meeting.participant_count} participant
            {meeting.participant_count === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewDetails}
          aria-label={`View details for ${meeting.title}`}
        >
          Details
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
        {cancelable && (
          <Button
            variant="danger"
            size="sm"
            onClick={onCancel}
            aria-label={`Cancel ${meeting.title}`}
            title="Cancel this scheduled meeting"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        )}
        <Button
          variant={joinable ? 'primary' : 'ghost'}
          size="sm"
          onClick={onJoin}
          disabled={!joinable || disableAllJoins}
          aria-label={
            joinable ? `Join ${meeting.title}` : `${meeting.title} is ${meeting.status}`
          }
        >
          {isJoining ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Joining…
            </>
          ) : joinable ? (
            <>
              <Video className="h-3.5 w-3.5" aria-hidden="true" />
              Join
            </>
          ) : (
            <span className="capitalize">{meeting.status}</span>
          )}
        </Button>
      </div>
    </motion.li>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-[#737373]">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-sm text-white">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-neutral-500/15 text-neutral-300 ring-neutral-500/30',
    submitted: 'bg-blue-500/15 text-blue-300 ring-blue-500/30',
    under_review: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
    linked_to_capa: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    closed: 'bg-neutral-500/15 text-neutral-400 ring-neutral-500/30',
  };
  const cls = colors[status] ?? 'bg-neutral-500/15 text-neutral-300 ring-neutral-500/30';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ${cls}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function MeetingStatusPill({ status }: { status: string }) {
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

function SeverityPill({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    minor: 'bg-neutral-500/15 text-neutral-300 ring-neutral-500/30',
    major: 'bg-orange-500/15 text-orange-300 ring-orange-500/30',
    critical: 'bg-red-500/15 text-red-300 ring-red-500/30',
  };
  const cls = colors[severity] ?? 'bg-neutral-500/15 text-neutral-300 ring-neutral-500/30';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ${cls}`}
    >
      {severity === 'critical' && <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />}
      {severity}
    </span>
  );
}

function ReportableBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-purple-300 ring-1 ring-purple-500/30"
      title="Regulatory reportable"
    >
      <Shield className="h-2.5 w-2.5" aria-hidden="true" />
      Reportable
    </span>
  );
}

function PhasePill({ phase }: { phase: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#10b981]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#10b981] ring-1 ring-[#10b981]/25">
      <Activity className="h-2.5 w-2.5" aria-hidden="true" />
      {phase.replace(/_/g, ' ')}
    </span>
  );
}

function CaseDetailSkeleton() {
  return (
    <div className="mt-6 space-y-6">
      <div className="overflow-hidden rounded-2xl border border-[#262626] bg-[#141414]/80">
        <div className="space-y-3 border-b border-[#262626] px-6 py-5">
          <div className="flex gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-6 w-64" />
        </div>
        <div className="grid grid-cols-2 gap-4 px-6 py-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
        <div className="border-t border-[#262626] px-6 py-5">
          <Skeleton className="mb-2 h-3 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="mt-1 h-4 w-4/5" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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
