'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toaster';
import { ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      const user = useAuth.getState().user;
      router.push(user?.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err: any) {
      toast({
        title: 'Sign in failed',
        description: err.response?.data?.message || 'Please check your credentials',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* Left — editorial panel */}
      <aside className="hidden lg:flex relative bg-primary text-primary-foreground p-12 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 grain opacity-30" />

        <Link href="/" className="font-mono text-[11px] uppercase tracking-[0.25em] flex items-center gap-2 hover:text-accent transition-colors w-fit relative">
          <ArrowLeft className="h-3 w-3" />
          Return home
        </Link>

        <div className="relative space-y-4 max-w-md">
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] opacity-60">
            § Member access
          </span>
          <h1 className="font-display text-6xl tracking-tight leading-[0.95]">
            Welcome <br />
            <span className="italic font-light text-accent">back.</span>
          </h1>
          <p className="text-primary-foreground/70 leading-relaxed">
            Continue your projects, check your remaining hours, and reserve printer time at the IEMS lab.
          </p>
        </div>

        <div className="relative font-mono text-[10px] uppercase tracking-widest opacity-40">
          BCC · IEMS · Lab Studio · 2026
        </div>
      </aside>

      {/* Right — form */}
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden">
            <Link
              href="/"
              className="font-mono text-[11px] uppercase tracking-[0.25em] flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors w-fit mb-8"
            >
              <ArrowLeft className="h-3 w-3" />
              Return home
            </Link>
          </div>

          <div>
            <h2 className="font-display text-3xl tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Enter your credentials to access the lab system.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@bcc1852.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="border-t border-border pt-6 text-sm text-center">
            <span className="text-muted-foreground">No account yet?</span>{' '}
            <Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
              Register here
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
