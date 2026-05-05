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
    case 'training':       return 'อบรม';
    case 'inno_smart':     return 'Inno / Smart';
    case 'quota_bme':      return 'Quota BME';
    case 'quota_engineer': return 'Quota Engineer';
    case 'olympic':        return 'Olympic';
    case 'staff':          return 'Teacher / Staff';
    case 'customer':       return 'Customer';
    case 'biomedical':     return 'Biomedical Track';
    case 'engineer':       return 'Engineering Track';
    case 'secondary':      return 'Secondary';
    case 'primary':        return 'Primary';
    default:               return track;
  }
}
