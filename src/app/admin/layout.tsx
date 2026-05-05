import { SiteHeader } from '@/components/site-header';
import { AuthGuard } from '@/components/auth-guard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAdmin>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
    </AuthGuard>
  );
}
