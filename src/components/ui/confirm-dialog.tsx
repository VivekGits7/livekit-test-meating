import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  icon?: React.ReactNode;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
  icon,
}: ConfirmDialogProps) {
  const reducedMotion = useReducedMotion();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, loading]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={loading ? undefined : onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              aria-describedby="confirm-desc"
              className="w-full max-w-md overflow-hidden rounded-2xl border border-[#262626] bg-[#141414] shadow-2xl"
            >
              <div className="flex items-start gap-4 px-6 pt-6">
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ring-1 ${
                    confirmVariant === 'danger'
                      ? 'bg-red-500/15 ring-red-500/30'
                      : 'bg-[#10b981]/15 ring-[#10b981]/30'
                  }`}
                >
                  {icon ?? (
                    <AlertTriangle
                      className={`h-5 w-5 ${
                        confirmVariant === 'danger' ? 'text-red-400' : 'text-[#10b981]'
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 id="confirm-title" className="text-sm font-semibold text-white">
                    {title}
                  </h2>
                  <p id="confirm-desc" className="mt-1 text-sm text-[#a3a3a3]">
                    {description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  aria-label="Close"
                  className="cursor-pointer rounded-md p-1.5 text-[#737373] hover:bg-[#1a1a1a] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-[#262626] bg-[#0f0f0f] px-6 py-3 mt-5">
                <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                <Button
                  variant={confirmVariant}
                  size="sm"
                  onClick={() => void handleConfirm()}
                  disabled={loading}
                  autoFocus
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      Working…
                    </>
                  ) : (
                    confirmLabel
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
