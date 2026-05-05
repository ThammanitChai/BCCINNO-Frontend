import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatHours(h: number): string {
  if (h === 0) return '0h';
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(h % 1 === 0 ? 0 : 1)}h`;
}

export function trackLabel(track: string): string {
  switch (track) {
    case 'biomedical':
      return 'Biomedical Track';
    case 'engineer':
      return 'Engineering Track';
    case 'secondary':
      return 'Secondary';
    case 'primary':
      return 'Primary';
    case 'staff':
      return 'BCC Staff';
    default:
      return track;
  }
}
