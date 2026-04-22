import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'danger' | 'ghost' | 'icon';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-[#10b981] hover:bg-[#059669] text-white font-semibold shadow-lg shadow-emerald-900/20',
  danger:
    'bg-[#ef4444] hover:bg-[#dc2626] text-white font-semibold shadow-lg shadow-red-900/20',
  ghost:
    'bg-[#1a1a1a] hover:bg-[#262626] text-white border border-[#262626]',
  icon:
    'bg-[#1a1a1a] hover:bg-[#262626] text-white border border-[#262626]',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-xs rounded-md',
  md: 'h-11 px-5 text-sm rounded-lg',
  lg: 'h-12 px-6 text-base rounded-lg',
  icon: 'h-11 w-11 rounded-full flex items-center justify-center',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10b981]/40',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = 'Button';
