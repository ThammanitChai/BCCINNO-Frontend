'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/store';
import { Toaster } from '@/components/ui/toaster';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  const initialize = useAuth((s) => s.initialize);
  useEffect(() => {
    // Sync token from localStorage into store on first load
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('iems_token');
      if (token) {
        useAuth.setState({ token });
      }
      initialize();
    }
  }, [initialize]);

  return (
    <QueryClientProvider client={client}>
      <Toaster>{children}</Toaster>
    </QueryClientProvider>
  );
}
