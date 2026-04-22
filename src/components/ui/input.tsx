import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-lg border border-[#262626] bg-[#141414] px-4 text-sm text-white',
        'placeholder:text-[#525252]',
        'focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]/20',
        'transition-colors duration-150',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-[#262626] bg-[#141414] px-4 py-3 text-sm text-white resize-none',
        'placeholder:text-[#525252]',
        'focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]/20',
        'transition-colors duration-150',
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';
