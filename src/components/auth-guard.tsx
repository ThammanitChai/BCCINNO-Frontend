'use client';

import { useAuth } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface Props {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function AuthGuard({ children, requireAdmin = false }: Props) {
  const router = useRouter();
  const { user, token, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!token || !user) {
      router.replace('/login');
      return;
    }
    if (requireAdmin && user.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [user, token, loading, requireAdmin, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          ··· loading ···
        </div>
      </div>
    );
  }

  if (requireAdmin && user.role !== 'admin') return null;

  return <>{children}</>;
}
