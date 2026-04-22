import { useTrackToggle, useLocalParticipant } from '@livekit/components-react';
import { Track } from 'livekit-client';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Monitor,
  MonitorOff,
  MessageSquare,
  PhoneOff,
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface ControlBarProps {
  chatOpen: boolean;
  onToggleChat: () => void;
  onLeave: () => void;
}

export default function ControlBar({ chatOpen, onToggleChat, onLeave }: ControlBarProps) {
  const { localParticipant } = useLocalParticipant();

  // IMPORTANT: Leave must NEVER call `POST /api/meetings/{id}/end`.
  // That endpoint marks the meeting as `completed` and triggers report generation —
  // we reserve that for the LiveKit agent worker (it fires end logic only when every
  // human has disconnected from the room). A user leaving just disconnects from
  // LiveKit locally and navigates back in state — no backend mutation.
  const handleLeave = async () => {
    try {
      await localParticipant.setCameraEnabled(false);
      await localParticipant.setMicrophoneEnabled(false);
    } catch {
      /* noop */
    }
    onLeave();
  };

  return (
    <div className="flex items-center justify-center gap-2 border-t border-[#262626] bg-[#0a0a0a] px-4 py-3 sm:gap-3">
      <MicButton />
      <CameraButton />
      <ScreenShareButton />
      <div className="mx-1 h-8 w-px bg-[#262626]" />
      <ChatToggleButton active={chatOpen} onClick={onToggleChat} />
      <div className="mx-1 h-8 w-px bg-[#262626]" />
      <button
        onClick={handleLeave}
        aria-label="Leave meeting"
        className="flex h-11 cursor-pointer items-center gap-2 rounded-full bg-[#ef4444] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#dc2626] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef4444]/40"
      >
        <PhoneOff className="h-4 w-4" />
        Leave
      </button>
    </div>
  );
}

function MicButton() {
  const { buttonProps, enabled } = useTrackToggle({ source: Track.Source.Microphone });
  return (
    <ControlIconButton
      {...buttonProps}
      active={enabled}
      label={enabled ? 'Mute microphone' : 'Unmute microphone'}
    >
      {enabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
    </ControlIconButton>
  );
}

function CameraButton() {
  const { buttonProps, enabled } = useTrackToggle({ source: Track.Source.Camera });
  return (
    <ControlIconButton
      {...buttonProps}
      active={enabled}
      label={enabled ? 'Turn camera off' : 'Turn camera on'}
    >
      {enabled ? <VideoIcon className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
    </ControlIconButton>
  );
}

function ScreenShareButton() {
  const { buttonProps, enabled } = useTrackToggle({ source: Track.Source.ScreenShare });
  return (
    <ControlIconButton
      {...buttonProps}
      active={enabled}
      label={enabled ? 'Stop screen share' : 'Share screen'}
    >
      {enabled ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
    </ControlIconButton>
  );
}

function ChatToggleButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <ControlIconButton
      onClick={onClick}
      active={active}
      label={active ? 'Close chat' : 'Open chat'}
    >
      <MessageSquare className="h-4 w-4" />
    </ControlIconButton>
  );
}

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  label: string;
};

function ControlIconButton({
  active,
  label,
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        'flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10b981]/40',
        'disabled:cursor-not-allowed disabled:opacity-50',
        active
          ? 'bg-[#1f2937] text-white hover:bg-[#262626]'
          : 'bg-[#ef4444]/20 text-[#f87171] hover:bg-[#ef4444]/30',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
