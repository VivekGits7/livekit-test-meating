import { FormEvent, useState } from 'react';
import { motion } from 'motion/react';
import { Video, ArrowRight, Mail, Lock, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { login } from '@/lib/api';
import type { AuthUser } from '@/lib/api';

interface LoginPageProps {
  onAuthenticated: (token: string, user: AuthUser) => void;
}

export default function LoginPage({ onAuthenticated }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const { access_token, user } = await login(trimmedEmail, password);
      onAuthenticated(access_token, user);
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: { message?: string }; detail?: string } } })
          ?.response?.data?.error?.message ??
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        (err as Error).message ??
        'Login failed. Check your email and password.';
      setError(typeof message === 'string' ? message : 'Login failed.');
    } finally {
      setLoading(false);
    }
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
          className="w-full max-w-md"
        >
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#10b981]/15 ring-1 ring-[#10b981]/30">
              <Video className="h-5 w-5 text-[#10b981]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">MedTech CAPA</h1>
              <p className="text-xs text-[#737373]">Sign in to access your meetings</p>
            </div>
          </div>

          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl border border-[#262626] bg-[#141414]/80 p-6 backdrop-blur-xl sm:p-8"
          >
            <h2 className="text-2xl font-bold tracking-tight text-white">Welcome back</h2>
            <p className="mt-1 text-sm text-[#a3a3a3]">Enter your credentials to continue.</p>

            <div className="mt-6 space-y-4">
              <Field label="Email" icon={<Mail className="h-4 w-4" />} required>
                <Input
                  type="email"
                  placeholder="you@medtech.test"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={loading}
                />
              </Field>

              <Field label="Password" icon={<Lock className="h-4 w-4" />} required>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
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

            <Button type="submit" size="lg" className="mt-6 w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
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
