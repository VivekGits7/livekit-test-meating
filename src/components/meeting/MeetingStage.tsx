import { useState } from 'react';
import { motion } from 'motion/react';
import {
  useConnectionState,
  useLocalParticipant,
  useRoomContext,
} from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';
import { Loader2 } from 'lucide-react';
import VideoGrid from './VideoGrid';
import ControlBar from './ControlBar';
import ChatPanel from './ChatPanel';
import TopBar from './TopBar';
import AddParticipantModal from '@/components/meetings/AddParticipantModal';
import type { JoinSession } from '@/types/session';

interface MeetingStageProps {
  session: JoinSession;
  onLeave: () => void;
}

export default function MeetingStage({ session, onLeave }: MeetingStageProps) {
  const state = useConnectionState();
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [chatOpen, setChatOpen] = useState(false);
  const [addParticipantOpen, setAddParticipantOpen] = useState(false);

  // Apply display name as metadata once connected
  if (state === ConnectionState.Connected && localParticipant.name !== session.displayName) {
    void localParticipant.setName(session.displayName);
  }

  if (state === ConnectionState.Connecting || state === ConnectionState.Reconnecting) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#10b981]" />
          <p className="text-sm text-[#a3a3a3]">
            {state === ConnectionState.Connecting ? 'Connecting to room…' : 'Reconnecting…'}
          </p>
        </div>
      </div>
    );
  }

  if (state === ConnectionState.Disconnected) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-sm text-[#a3a3a3]">Disconnected.</p>
      </div>
    );
  }

  const canAddParticipant = Boolean(session.meetingId && session.backendToken);

  return (
    <div className="flex h-full w-full flex-col">
      <TopBar
        roomName={room.name}
        canAddParticipant={canAddParticipant}
        onAddParticipant={() => setAddParticipantOpen(true)}
      />

      <div className="relative flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden p-4">
          <VideoGrid />
        </div>

        {/*
          ChatPanel stays MOUNTED even when chat is closed so that `useChat`'s
          internal state (received messages + data-channel subscription) survives.
          If we unmount, any message that arrives while the panel is closed is lost.
          The outer div collapses to 0 width when closed, inner keeps a stable 380px
          layout so ChatPanel doesn't reflow its children during the animation.
        */}
        <motion.div
          initial={false}
          animate={{ width: chatOpen ? 380 : 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="flex-shrink-0 overflow-hidden border-l border-[#262626] bg-[#0f0f0f]"
          style={{
            borderLeftWidth: chatOpen ? 1 : 0,
          }}
        >
          <div className="h-full w-[380px]">
            <ChatPanel
              session={session}
              onClose={() => setChatOpen(false)}
            />
          </div>
        </motion.div>
      </div>

      <ControlBar
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen((v) => !v)}
        onLeave={onLeave}
      />

      {canAddParticipant && session.meetingId && session.backendToken && (
        <AddParticipantModal
          open={addParticipantOpen}
          onClose={() => setAddParticipantOpen(false)}
          meetingId={session.meetingId}
          backendToken={session.backendToken}
        />
      )}
    </div>
  );
}
