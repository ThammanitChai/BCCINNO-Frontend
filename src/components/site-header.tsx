'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const studentNav = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/reserve', label: 'Reserve' },
    { href: '/printers', label: 'Printers' },
    { href: '/history', label: 'History' },
  ];

  const adminNav = [
    { href: '/admin', label: 'Overview' },
    { href: '/admin/users', label: 'Members' },
    { href: '/admin/printers', label: 'Fleet' },
    { href: '/admin/filaments', label: 'Stock' },
    { href: '/admin/reservations', label: 'Logs' },
  ];

  const nav = user?.role === 'admin' ? adminNav : studentNav;

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-10">
          <Link href={user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/'} className="flex items-center gap-3 group">
            <img src="/bcclogo.png" alt="BCC" className="h-7 w-auto" />
            <div className="flex flex-col leading-none">
              <span className="font-display text-base font-semibold tracking-tight text-purple-700">IEMS Lab</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Innovation Studio</span>
            </div>
          </Link>

          {user && (
            <nav className="hidden md:flex items-center gap-1">
              {nav.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'relative px-3 py-1.5 text-sm font-medium transition-colors',
                      active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {item.label}
                    {active && (
                      <span className="absolute -bottom-[17px] left-0 right-0 h-[2px] bg-purple-600" />
                    )}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link href="/profile" className="hidden sm:flex flex-col items-end leading-tight hover:opacity-70 transition-opacity">
                <span className="text-sm font-medium">{user.firstName} {user.lastName}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {user.role === 'admin' ? '◆ Administrator' : `${user.studentId} · ${user.track}`}
                </span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  logout();
                  router.push('/login');
                }}
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setOpen((v) => !v)}
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button variant="default" asChild>
                <Link href="/register">Register</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {user && open && (
        <div className="md:hidden border-t border-border/60 bg-background">
          <nav className="flex flex-col p-4 gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium',
                  pathname === item.href
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-secondary'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
