import { useState } from 'react';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import { Room } from 'livekit-client';
import MeetingStage from './MeetingStage';
import type { JoinSession } from '@/types/session';

interface MeetingRoomProps {
  session: JoinSession;
  onLeave: () => void;
}

const roomOptions = {
  adaptiveStream: true,
  dynacast: true,
  publishDefaults: {
    simulcast: true,
  },
};

export default function MeetingRoom({ session, onLeave }: MeetingRoomProps) {
  const [error, setError] = useState<string | null>(null);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-[#141414] p-8 text-center">
          <h2 className="text-xl font-bold text-white">Connection failed</h2>
          <p className="mt-2 text-sm text-[#a3a3a3]">{error}</p>
          <button
            onClick={onLeave}
            className="mt-6 rounded-lg bg-[#10b981] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#059669]"
          >
            Back to join screen
          </button>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={session.liveKitUrl}
      token={session.token}
      connect={true}
      video={true}
      audio={true}
      options={roomOptions}
      // IMPORTANT: `onDisconnected` must NEVER call POST /api/meetings/{id}/end.
      // That endpoint is reserved for the agent worker when the room fully empties.
      // Here we only navigate back in local state via the parent's `onLeave` callback.
      onDisconnected={onLeave}
      onError={(err: Error) => setError(err.message || 'Could not connect to the room.')}
      className="h-full w-full bg-background"
      data-lk-theme="default"
    >
      <RoomAudioRenderer />
      <MeetingStage session={session} onLeave={onLeave} />
    </LiveKitRoom>
  );
}

// Re-export Room so TS doesn't complain about unused import
export type { Room };
