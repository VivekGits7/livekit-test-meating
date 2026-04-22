import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import JoinForm from '@/components/join/JoinForm';
import MeetingRoom from '@/components/meeting/MeetingRoom';
import type { JoinSession } from '@/types/session';

export default function App() {
  const [session, setSession] = useState<JoinSession | null>(null);

  return (
    <div className="h-full w-full bg-background text-white">
      <AnimatePresence mode="wait">
        {session ? (
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
        ) : (
          <motion.div
            key="join"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="h-full w-full"
          >
            <JoinForm onJoin={setSession} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
