import { FormEvent, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { UserPlus, X, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { addParticipant, makeApiClient } from '@/lib/api';

interface AddParticipantModalProps {
  open: boolean;
  onClose: () => void;
  meetingId: string;
  backendToken: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function AddParticipantModal({
  open,
  onClose,
  meetingId,
  backendToken,
}: AddParticipantModalProps) {
  const [userId, setUserId] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [discussionPoints, setDiscussionPoints] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setUserId('');
    setPriority('medium');
    setDiscussionPoints('');
    setError(null);
    setSuccess(false);
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedId = userId.trim();
    if (!UUID_RE.test(trimmedId)) {
      setError('Please enter a valid user UUID.');
      return;
    }

    const points = discussionPoints
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    setLoading(true);
    try {
      await addParticipant(makeApiClient(backendToken), meetingId, {
        user_id: trimmedId,
        priority,
        discussion_points: points.length > 0 ? points : undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        reset();
        onClose();
      }, 900);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ??
        (err as Error).message ??
        'Failed to add participant.';
      setError(typeof msg === 'string' ? msg : 'Failed to add participant.');
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={loading ? undefined : handleClose}
          />

          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
          >
            <form
              onSubmit={handleSubmit}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-[#262626] bg-[#141414] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#262626] px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#10b981]/15 ring-1 ring-[#10b981]/30">
                    <UserPlus className="h-4 w-4 text-[#10b981]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Add participant</h3>
                    <p className="text-xs text-[#737373]">
                      Name, role, and responsibilities load from the users table
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="cursor-pointer rounded-md p-1.5 text-[#737373] hover:bg-[#1a1a1a] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 px-6 py-5">
                <label className="block">
                  <span className="mb-2 block text-xs font-medium text-[#a3a3a3]">
                    User UUID <span className="text-[#10b981]">*</span>
                  </span>
                  <Input
                    placeholder="c9636f46-1080-4729-8f88-d2acd16fcfe7"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    autoComplete="off"
                    disabled={loading || success}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-medium text-[#a3a3a3]">
                    Priority
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['high', 'medium', 'low'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        disabled={loading || success}
                        onClick={() => setPriority(p)}
                        className={`h-10 cursor-pointer rounded-lg border text-xs font-medium capitalize transition-colors disabled:cursor-not-allowed ${
                          priority === p
                            ? 'border-[#10b981] bg-[#10b981]/15 text-[#10b981]'
                            : 'border-[#262626] bg-[#1a1a1a] text-[#a3a3a3] hover:bg-[#262626]'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-medium text-[#a3a3a3]">
                    Discussion points{' '}
                    <span className="text-[#525252]">(one per line, optional)</span>
                  </span>
                  <Textarea
                    placeholder={'e.g.\nReview the pressure-sensor drift data\nConfirm containment status'}
                    value={discussionPoints}
                    onChange={(e) => setDiscussionPoints(e.target.value)}
                    rows={3}
                    disabled={loading || success}
                  />
                </label>

                {error && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    Participant added — DM sent to their inbox.
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-[#262626] bg-[#0f0f0f] px-6 py-3">
                <Button type="button" variant="ghost" size="sm" onClick={handleClose} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={loading || success}>
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Adding…
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3.5 w-3.5" />
                      Add participant
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
