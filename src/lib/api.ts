import axios from 'axios';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('iems_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      // Token expired or invalid
      const path = window.location.pathname;
      if (!path.startsWith('/login') && !path.startsWith('/register')) {
        localStorage.removeItem('iems_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export type Track =
  | 'training'
  | 'inno_smart'
  | 'quota_bme'
  | 'quota_engineer'
  | 'olympic'
  | 'staff'
  | 'customer';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  studentId: string;
  track: Track;
  role: 'student' | 'admin';
  phone?: string;
  hoursQuota: number;
  hoursUsed: number;
  hoursRemaining: number;
}

export interface Printer {
  _id: string;
  name: string;
  modelName: string;
  type: 'FDM' | 'Resin';
  status: 'available' | 'in_use' | 'maintenance';
  currentUser?: { firstName: string; lastName: string; studentId: string };
  totalHoursUsed: number;
  notes?: string;
  bambuSerial?: string;
  bambuIp?: string;
  bambuAccessCode?: string;
}

export interface Reservation {
  _id: string;
  user: { _id: string; firstName: string; lastName: string; studentId: string; email?: string };
  printer: { _id: string; name: string; modelName?: string; type?: string };
  jobName: string;
  filamentType?: string;
  filamentColor?: string;
  filamentWeight?: number;
  scheduledStart: string;
  scheduledHours: number;
  actualStart?: string;
  actualEnd?: string;
  hoursConsumed?: number;
  status: 'reserved' | 'in_progress' | 'completed' | 'cancelled';
  fileUrl?: string;
  modelFileName?: string;
  infillPercent?: number;
  cost?: number;
}

export interface Filament {
  _id: string;
  type: string;
  brand: string;
  subBrand?: string;
  color: string;
  recommendedStock: number;
  minimumStock: number;
  currentAmount: number;
  pricePerGram: number;
  isDiscontinued: boolean;
}
