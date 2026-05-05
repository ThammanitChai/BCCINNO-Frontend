'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, User } from './api';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  studentId: string;
  nationalIdLast4?: string;
  phone?: string;
  track:
    | 'biomedical'
    | 'engineer'
    | 'secondary'
    | 'primary'
    | 'staff';
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: true,

      initialize: async () => {
        const token = get().token;
        if (!token) {
          set({ loading: false });
          return;
        }
        try {
          const { data } = await api.get<User>('/auth/me');
          set({ user: data, loading: false });
        } catch {
          set({ user: null, token: null, loading: false });
          if (typeof window !== 'undefined') {
            localStorage.removeItem('iems_token');
          }
        }
      },

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        if (typeof window !== 'undefined') {
          localStorage.setItem('iems_token', data.token);
        }
        set({ user: data.user, token: data.token });
      },

      register: async (payload) => {
        const { data } = await api.post('/auth/register', payload);
        if (typeof window !== 'undefined') {
          localStorage.setItem('iems_token', data.token);
        }
        set({ user: data.user, token: data.token });
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('iems_token');
        }
        set({ user: null, token: null });
      },

      refreshUser: async () => {
        try {
          const { data } = await api.get<User>('/auth/me');
          set({ user: data });
        } catch {
          // ignore
        }
      },
    }),
    {
      name: 'iems-auth',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
