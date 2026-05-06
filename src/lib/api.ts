import axios from 'axios';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

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

export type PrinterType = 'FDM_open' | 'FDM_closed' | 'Resin';

export type ReservationStatus =
  | 'pending_review'
  | 'pending_confirmation'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface FileAttachment {
  url: string;
  originalName: string;
}

export interface ReservationComment {
  from: 'admin' | 'student';
  message: string;
  createdAt: string;
}

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
  type: PrinterType;
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
  user: { _id: string; firstName: string; lastName: string; studentId: string; email?: string; track?: string };
  printer?: { _id: string; name: string; modelName?: string; type?: PrinterType; bambuSerial?: string; bambuIp?: string; bambuAccessCode?: string };
  printerType: PrinterType;
  jobName: string;
  filamentType?: string;
  infillPercent?: number;
  scheduledStart: string;
  estimatedHours?: number;
  estimatedWeight?: number;
  hoursConsumed?: number;
  actualStart?: string;
  actualEnd?: string;
  status: ReservationStatus;
  files: FileAttachment[];
  sliceImages: FileAttachment[];
  resultPhotos: FileAttachment[];
  comments: ReservationComment[];
  notes?: string;
  pickupTime?: string;
  createdAt: string;
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
