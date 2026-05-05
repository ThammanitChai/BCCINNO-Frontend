import { SiteHeader } from '@/components/site-header';
import { AuthGuard } from '@/components/auth-guard';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
    </AuthGuard>
  );
}
