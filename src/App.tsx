import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import LoginPage from '@/components/auth/LoginPage';
import CasesListPage from '@/components/cases/CasesListPage';
import CaseDetailPage from '@/components/cases/CaseDetailPage';
import MeetingRoom from '@/components/meeting/MeetingRoom';
import { useAuth } from '@/lib/auth';
import type { JoinSession } from '@/types/session';

export default function App() {
  const auth = useAuth();
  const [session, setSession] = useState<JoinSession | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const screen: 'checking' | 'login' | 'cases' | 'case-detail' | 'meeting' =
    auth.status === 'checking'
      ? 'checking'
      : auth.status !== 'authed' || !auth.token || !auth.user
        ? 'login'
        : session
          ? 'meeting'
          : selectedCaseId
            ? 'case-detail'
            : 'cases';

  return (
    <div className="h-full w-full bg-background text-white">
      <AnimatePresence mode="wait">
        {screen === 'checking' && (
          <motion.div
            key="checking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex h-full w-full items-center justify-center"
          >
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-[#10b981]" />
              <p className="text-sm text-[#a3a3a3]">Restoring your session…</p>
            </div>
          </motion.div>
        )}

        {screen === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="h-full w-full"
          >
            <LoginPage onAuthenticated={auth.setAuth} />
          </motion.div>
        )}

        {screen === 'cases' && auth.token && auth.user && (
          <motion.div
            key="cases"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className="h-full w-full"
          >
            <CasesListPage
              token={auth.token}
              user={auth.user}
              onOpenCase={(id) => setSelectedCaseId(id)}
              onLogout={() => {
                auth.logout();
                setSelectedCaseId(null);
                setSession(null);
              }}
            />
          </motion.div>
        )}

        {screen === 'case-detail' && auth.token && auth.user && selectedCaseId && (
          <motion.div
            key={`case-${selectedCaseId}`}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3 }}
            className="h-full w-full"
          >
            <CaseDetailPage
              token={auth.token}
              user={auth.user}
              caseId={selectedCaseId}
              onBack={() => setSelectedCaseId(null)}
              onJoin={setSession}
            />
          </motion.div>
        )}

        {screen === 'meeting' && session && (
          <motion.div
            key="meeting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full w-full"
          >
            <MeetingRoom session={session} onLeave={() => setSession(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
