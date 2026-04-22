import { useEffect, useState } from 'react';
import { useParticipants } from '@livekit/components-react';
import { Users, Video, Radio } from 'lucide-react';

interface TopBarProps {
  roomName?: string;
}

export default function TopBar({ roomName }: TopBarProps) {
  const participants = useParticipants();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const formatElapsed = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
  };

  return (
    <div className="flex items-center justify-between border-b border-[#262626] bg-[#0a0a0a] px-5 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#10b981]/15 ring-1 ring-[#10b981]/30">
          <Video className="h-4 w-4 text-[#10b981]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-white">{roomName || 'Meeting'}</h1>
            <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-400">
              <Radio className="h-2.5 w-2.5 animate-pulse" />
              LIVE
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[#737373]">Connected · {formatElapsed(elapsed)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-[#262626] bg-[#141414] px-3 py-1.5">
        <Users className="h-3.5 w-3.5 text-[#a3a3a3]" />
        <span className="text-xs font-medium text-white">{participants.length}</span>
      </div>
    </div>
  );
}
