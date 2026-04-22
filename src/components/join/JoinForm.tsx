import { FormEvent, useState } from 'react';
import { motion } from 'motion/react';
import { Video, ArrowRight, KeyRound, Hash, User2, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { JoinSession } from '@/types/session';

interface JoinFormProps {
  onJoin: (session: JoinSession) => void;
}

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL ?? '';

export default function JoinForm({ onJoin }: JoinFormProps) {
  const [displayName, setDisplayName] = useState('');
  const [token, setToken] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [backendToken, setBackendToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedToken = token.trim();
    const trimmedName = displayName.trim();

    if (!trimmedName) {
      setError('Please enter a display name.');
      return;
    }
    if (!LIVEKIT_URL) {
      setError('LiveKit URL is not configured. Set VITE_LIVEKIT_URL in frontend/.env and rebuild.');
      return;
    }
    if (!trimmedToken) {
      setError('LiveKit access token is required.');
      return;
    }

    onJoin({
      displayName: trimmedName,
      liveKitUrl: LIVEKIT_URL,
      token: trimmedToken,
      meetingId: meetingId.trim() || undefined,
      backendToken: backendToken.trim() || undefined,
    });
  };

  return (
    <div className="relative h-full w-full overflow-y-auto">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(circle at 20% 10%, rgba(16,185,129,0.18), transparent 50%), radial-gradient(circle at 80% 90%, rgba(59,130,246,0.12), transparent 50%)',
        }}
      />

      <div className="relative mx-auto flex min-h-full max-w-5xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-xl"
        >
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#10b981]/15 ring-1 ring-[#10b981]/30">
              <Video className="h-5 w-5 text-[#10b981]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">MedTech Meeting</h1>
              <p className="text-xs text-[#737373]">CAPA video conference with AI agent</p>
            </div>
          </div>

          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl border border-[#262626] bg-[#141414]/80 p-6 backdrop-blur-xl sm:p-8"
          >
            <h2 className="text-2xl font-bold tracking-tight text-white">Join a meeting</h2>
            <p className="mt-1 text-sm text-[#a3a3a3]">
              Enter your LiveKit credentials to connect to the room.
            </p>

            <div className="mt-6 space-y-4">
              <Field label="Display name" icon={<User2 className="h-4 w-4" />} required>
                <Input
                  placeholder="Jane Doe"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoComplete="name"
                />
              </Field>

              <Field label="LiveKit access token" icon={<KeyRound className="h-4 w-4" />} required>
                <Input
                  placeholder="eyJhbGciOi…"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  autoComplete="off"
                />
              </Field>

              <div className="flex items-center gap-2 pt-2">
                <div className="h-px flex-1 bg-[#262626]" />
                <span className="text-[10px] uppercase tracking-widest text-[#525252]">
                  Optional — enables persistent chat
                </span>
                <div className="h-px flex-1 bg-[#262626]" />
              </div>

              <Field label="Meeting ID" icon={<Hash className="h-4 w-4" />}>
                <Input
                  placeholder="UUID from backend (for chat persistence)"
                  value={meetingId}
                  onChange={(e) => setMeetingId(e.target.value)}
                  autoComplete="off"
                />
              </Field>

              <Field label="Backend JWT" icon={<Lock className="h-4 w-4" />}>
                <Input
                  placeholder="Bearer token from /api/auth/login"
                  value={backendToken}
                  onChange={(e) => setBackendToken(e.target.value)}
                  autoComplete="off"
                  type="password"
                />
              </Field>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              >
                {error}
              </motion.div>
            )}

            <Button type="submit" size="lg" className="mt-6 w-full">
              Join meeting
              <ArrowRight className="h-4 w-4" />
            </Button>

            <p className="mt-4 text-center text-xs text-[#525252]">
              Without a backend JWT + meeting ID, chat is live-only and won't persist.
            </p>
          </motion.form>
        </motion.div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  required,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-xs font-medium text-[#a3a3a3]">
        {icon}
        {label}
        {required && <span className="text-[#10b981]">*</span>}
      </span>
      {children}
    </label>
  );
}
