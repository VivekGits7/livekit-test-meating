import {
  GridLayout,
  ParticipantTile,
  useTracks,
  TrackReferenceOrPlaceholder,
} from '@livekit/components-react';
import { Track } from 'livekit-client';

export default function VideoGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  ) as TrackReferenceOrPlaceholder[];

  if (tracks.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border border-[#262626] bg-[#141414]">
        <div className="text-center">
          <p className="text-sm text-[#a3a3a3]">Waiting for participants…</p>
        </div>
      </div>
    );
  }

  return (
    <GridLayout tracks={tracks} className="h-full w-full rounded-2xl">
      <ParticipantTile className="overflow-hidden rounded-xl" />
    </GridLayout>
  );
}
