import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronDown,
  Loader2,
  Trash2,
  ArrowRight,
  Check,
  Activity,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import {
  CASE_STATUS_TRANSITIONS,
  CAPA_PHASE_PROGRESSION,
  advanceCapaPhase,
  deleteCase,
  updateCaseStatus,
} from '@/lib/api';
import type {
  CapaPhaseValue,
  CaseData,
  CaseStatusValue,
} from '@/lib/api';
import { makeApiClient } from '@/lib/api';

interface CaseActionsBarProps {
  token: string;
  caseData: CaseData;
  onStatusChanged: () => void;
  onCaseDeleted: () => void;
}

export default function CaseActionsBar({
  token,
  caseData,
  onStatusChanged,
  onCaseDeleted,
}: CaseActionsBarProps) {
  const client = useMemo(() => makeApiClient(token), [token]);

  const status = caseData.status as CaseStatusValue;
  const allowedNextStatuses = CASE_STATUS_TRANSITIONS[status] ?? [];
  const isDraft = status === 'draft';
  const isClosed = status === 'closed';

  const currentPhase = (caseData.current_phase ?? null) as CapaPhaseValue | null;
  const nextPhase = currentPhase ? CAPA_PHASE_PROGRESSION[currentPhase] : null;
  const showAdvancePhase = Boolean(currentPhase && nextPhase && !isDraft && !isClosed);

  const [menuOpen, setMenuOpen] = useState(false);
  const [statusBusy, setStatusBusy] = useState<CaseStatusValue | null>(null);
  const [phaseBusy, setPhaseBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<CaseStatusValue | null>(null);
  const [confirmPhase, setConfirmPhase] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doUpdateStatus = async (target: CaseStatusValue) => {
    setStatusBusy(target);
    setError(null);
    try {
      await updateCaseStatus(client, caseData.case_id, target);
      setMenuOpen(false);
      setConfirmStatus(null);
      onStatusChanged();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update status.'));
    } finally {
      setStatusBusy(null);
    }
  };

  const doAdvancePhase = async () => {
    if (!nextPhase) return;
    setPhaseBusy(true);
    setError(null);
    try {
      await advanceCapaPhase(client, caseData.case_id, nextPhase);
      setConfirmPhase(false);
      onStatusChanged();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to advance phase.'));
    } finally {
      setPhaseBusy(false);
    }
  };

  const doDelete = async () => {
    setDeleteBusy(true);
    setError(null);
    try {
      await deleteCase(client, caseData.case_id);
      setConfirmDelete(false);
      onCaseDeleted();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to delete case.'));
      setDeleteBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {/* Change status menu */}
        {allowedNextStatuses.length > 0 && (
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Change case status"
            >
              <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
              Change status
              <ChevronDown
                className={`h-3 w-3 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </Button>

            <AnimatePresence>
              {menuOpen && (
                <>
                  <button
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                    aria-hidden="true"
                    tabIndex={-1}
                  />
                  <motion.div
                    role="menu"
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-lg border border-[#262626] bg-[#141414] p-1 shadow-2xl"
                  >
                    <div className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-[#737373]">
                      Next allowed status
                    </div>
                    {allowedNextStatuses.map((next) => {
                      const busy = statusBusy === next;
                      return (
                        <button
                          key={next}
                          role="menuitem"
                          onClick={() => setConfirmStatus(next)}
                          disabled={busy || statusBusy !== null}
                          className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-xs text-[#d4d4d4] hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="flex items-center gap-2">
                            <ArrowRight className="h-3 w-3 text-[#10b981]" aria-hidden="true" />
                            <span className="capitalize">{next.replace(/_/g, ' ')}</span>
                          </span>
                          {busy && (
                            <Loader2
                              className="h-3 w-3 animate-spin text-[#a3a3a3]"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Advance CAPA phase */}
        {showAdvancePhase && nextPhase && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmPhase(true)}
            disabled={phaseBusy}
            aria-label={`Advance CAPA phase to ${nextPhase.replace(/_/g, ' ')}`}
          >
            <Activity className="h-3.5 w-3.5" aria-hidden="true" />
            Advance to {nextPhase.replace(/_/g, ' ')}
          </Button>
        )}

        {/* Delete draft case */}
        {isDraft && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            disabled={deleteBusy}
            aria-label="Delete this draft case"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Delete
          </Button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
        >
          {error}
        </div>
      )}

      {/* Status-change confirmation */}
      <ConfirmDialog
        open={confirmStatus !== null}
        onClose={() => setConfirmStatus(null)}
        onConfirm={() => {
          if (confirmStatus) return doUpdateStatus(confirmStatus);
        }}
        title="Change case status?"
        description={
          confirmStatus
            ? `Move this case from "${status.replace(/_/g, ' ')}" to "${confirmStatus.replace(/_/g, ' ')}". ${
                confirmStatus === 'linked_to_capa'
                  ? 'This will auto-propose the first root-cause-analysis meeting and DM the invited participants.'
                  : 'This transition will be logged on the case history.'
              }`
            : ''
        }
        confirmLabel="Change status"
        confirmVariant="primary"
        icon={<Check className="h-5 w-5 text-[#10b981]" aria-hidden="true" />}
      />

      {/* Advance-phase confirmation */}
      <ConfirmDialog
        open={confirmPhase}
        onClose={() => setConfirmPhase(false)}
        onConfirm={doAdvancePhase}
        title={`Advance CAPA phase to "${nextPhase?.replace(/_/g, ' ') ?? ''}"?`}
        description={
          nextPhase === 'completed'
            ? 'This marks the CAPA as complete and triggers final report generation. Only advance when all phases have concrete evidence of completion.'
            : `This advances from "${currentPhase?.replace(/_/g, ' ') ?? ''}" to "${nextPhase?.replace(/_/g, ' ') ?? ''}". Further follow-up meetings will target the new phase.`
        }
        confirmLabel="Advance phase"
        confirmVariant="primary"
        icon={<Activity className="h-5 w-5 text-[#10b981]" aria-hidden="true" />}
      />

      {/* Delete-case confirmation */}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={doDelete}
        title="Delete this draft case?"
        description="This permanently deletes the case. Only draft cases can be deleted — submitted or CAPA-linked cases must be closed instead."
        confirmLabel="Delete case"
        confirmVariant="danger"
      />
    </div>
  );
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
