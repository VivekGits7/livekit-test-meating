import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  FolderOpen,
  LogOut,
  Bell,
  RefreshCw,
  Search,
  AlertTriangle,
  Shield,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import InboxPanel from '@/components/inbox/InboxPanel';
import { getUnreadCount, listCases, makeApiClient } from '@/lib/api';
import type { AuthUser, CaseListItem } from '@/lib/api';

interface CasesListPageProps {
  token: string;
  user: AuthUser;
  onOpenCase: (caseId: string) => void;
  onLogout: () => void;
}

export default function CasesListPage({
  token,
  user,
  onOpenCase,
  onLogout,
}: CasesListPageProps) {
  const client = useMemo(() => makeApiClient(token), [token]);
  const reducedMotion = useReducedMotion();

  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [inboxOpen, setInboxOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const pollRef = useRef<number | null>(null);

  // Debounce search → 300ms
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const { cases: items, total: count } = await listCases(client, {
          search: debouncedSearch || undefined,
          limit: 50,
        });
        setCases(items);
        setTotal(count);
      } catch (err) {
        setError(extractErrorMessage(err, 'Failed to load cases.'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [client, debouncedSearch]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  // Unread count polling — 30s
  useEffect(() => {
    let cancelled = false;
    const fetchUnread = async () => {
      try {
        const count = await getUnreadCount(client);
        if (!cancelled) setUnreadCount(count);
      } catch {
        // Non-fatal
      }
    };
    void fetchUnread();
    pollRef.current = window.setInterval(() => void fetchUnread(), 30_000);
    return () => {
      cancelled = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [client]);

  const fadeIn = reducedMotion
    ? { initial: false, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

  return (
    <main
      className="relative h-full w-full overflow-y-auto"
      aria-labelledby="cases-heading"
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
              <FolderOpen className="h-5 w-5 text-[#10b981]" aria-hidden="true" />
            </div>
            <div>
              <h1 id="cases-heading" className="text-xl font-bold tracking-tight text-white">
                Cases
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
              aria-label={unreadCount > 0 ? `Inbox (${unreadCount} unread)` : 'Inbox'}
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
              aria-label="Refresh cases list"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={onLogout} aria-label="Sign out">
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Sign out
            </Button>
          </div>
        </motion.header>

        <div className="mt-6">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#525252]"
              aria-hidden="true"
            />
            <Input
              placeholder="Search by device, description, or case number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              aria-label="Search cases"
            />
          </div>
        </div>

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

        <section className="mt-6" aria-label="Case list">
          {loading ? (
            <CasesSkeleton />
          ) : cases.length === 0 ? (
            <EmptyCases hasSearch={!!debouncedSearch} />
          ) : (
            <>
              <p className="mb-3 text-xs text-[#737373]">
                {total} case{total === 1 ? '' : 's'} total
              </p>
              <ul className="space-y-3">
                <AnimatePresence>
                  {cases.map((c, idx) => (
                    <CaseRow
                      key={c.case_id}
                      item={c}
                      index={idx}
                      reducedMotion={!!reducedMotion}
                      onOpen={() => onOpenCase(c.case_id)}
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
          void load(true);
        }}
        token={token}
        onUnreadCountChange={setUnreadCount}
      />
    </main>
  );
}

function CaseRow({
  item,
  index,
  reducedMotion,
  onOpen,
}: {
  item: CaseListItem;
  index: number;
  reducedMotion: boolean;
  onOpen: () => void;
}) {
  return (
    <motion.li
      layout={!reducedMotion}
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
      transition={{ duration: 0.25, delay: reducedMotion ? 0 : index * 0.03 }}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full cursor-pointer items-center gap-4 rounded-xl border border-[#262626] bg-[#141414]/80 p-4 text-left backdrop-blur-xl transition-colors hover:border-[#10b981]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10b981]/40"
        aria-label={`Open case ${item.case_number} — ${item.device_name}`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-semibold text-[#10b981]">
              {item.case_number}
            </span>
            <StatusPill status={item.status} />
            <SeverityPill severity={item.severity} />
            {item.regulatory_reportable && <ReportableBadge />}
            {item.current_phase && <PhasePill phase={item.current_phase} />}
          </div>
          <h3 className="mt-1.5 truncate text-sm font-semibold text-white" title={item.device_name}>
            {item.device_name}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#737373]">
            <span className="capitalize">{item.category.replace(/_/g, ' ')}</span>
            <span className="text-[#404040]">·</span>
            <span>Patient impact: {item.patient_impact}</span>
            {item.created_at && (
              <>
                <span className="text-[#404040]">·</span>
                <span>{formatDate(item.created_at)}</span>
              </>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-[#525252]" aria-hidden="true" />
      </button>
    </motion.li>
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

function CasesSkeleton() {
  return (
    <ul className="space-y-3" aria-label="Loading cases">
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={i}
          className="flex items-center gap-4 rounded-xl border border-[#262626] bg-[#141414]/80 p-4"
        >
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-14" />
            </div>
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-4 w-4" />
        </li>
      ))}
    </ul>
  );
}

function EmptyCases({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="rounded-2xl border border-[#262626] bg-[#141414]/80 px-6 py-16 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1a1a1a] ring-1 ring-[#262626]">
        <FolderOpen className="h-6 w-6 text-[#737373]" aria-hidden="true" />
      </div>
      <h2 className="text-base font-semibold text-white">
        {hasSearch ? 'No cases match your search' : 'No cases yet'}
      </h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-[#a3a3a3]">
        {hasSearch
          ? 'Try a different device name, case number, or description.'
          : "You'll see cases here once incidents are registered in the system."}
      </p>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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
