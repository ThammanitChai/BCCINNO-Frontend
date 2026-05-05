'use client';

import { useQuery } from '@tanstack/react-query';
import { api, Printer, Reservation } from '@/lib/api';
import { useAuth } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatHours, trackLabel } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { ArrowRight, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function DashboardPage() {
  const user = useAuth((s) => s.user);

  const { data: printers = [] } = useQuery({
    queryKey: ['printers'],
    queryFn: async () => (await api.get<Printer[]>('/printers')).data,
  });

  const { data: reservations = [] } = useQuery({
    queryKey: ['reservations', 'mine'],
    queryFn: async () => (await api.get<Reservation[]>('/reservations')).data,
  });

  if (!user) return null;

  const remaining = user.hoursRemaining;
  const usedPct = user.hoursQuota
    ? Math.min(100, (user.hoursUsed / user.hoursQuota) * 100)
    : 0;

  const upcoming = reservations.filter((r) => r.status === 'reserved').slice(0, 3);
  const inProgress = reservations.find((r) => r.status === 'in_progress');
  const completed = reservations.filter((r) => r.status === 'completed').length;

  const availableCount = printers.filter((p) => p.status === 'available').length;

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-border pb-8">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            § Dashboard
          </span>
          <h1 className="mt-2 font-display text-5xl tracking-tight">
            Hello, <span className="italic font-light">{user.firstName}.</span>
          </h1>
          <div className="mt-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {user.studentId} · {trackLabel(user.track)}
          </div>
        </div>
        <Button asChild size="lg">
          <Link href="/reserve">
            New reservation <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Hours */}
      <section className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-full w-1/2 grain opacity-30" />
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Quota · this term
              </span>
              <Badge variant={remaining < 2 ? 'danger' : remaining < 5 ? 'warning' : 'success'}>
                {remaining < 2 ? 'Low balance' : remaining < 5 ? 'Running out' : 'Healthy'}
              </Badge>
            </div>
            <div className="flex items-baseline gap-3">
              <div className="font-display text-7xl numeric tracking-tight">
                {formatHours(remaining)}
              </div>
              <div className="text-muted-foreground">
                of {formatHours(user.hoursQuota)} remaining
              </div>
            </div>

            {/* progress */}
            <div className="mt-8 relative h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-accent transition-all"
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>{formatHours(user.hoursUsed)} used</span>
              <span>{usedPct.toFixed(0)}%</span>
            </div>
          </div>
        </Card>

        <Card className="p-8">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Quick stats
          </span>
          <div className="mt-6 space-y-5">
            <StatRow
              icon={<CheckCircle2 className="h-4 w-4" />}
              value={completed}
              label="Sessions completed"
            />
            <StatRow
              icon={<Clock className="h-4 w-4" />}
              value={upcoming.length}
              label="Upcoming"
            />
            <StatRow
              icon={<AlertCircle className="h-4 w-4 text-emerald-600" />}
              value={availableCount}
              label="Printers available"
            />
          </div>
        </Card>
      </section>

      {/* Active session */}
      {inProgress && (
        <Card className="border-accent/40 bg-accent/5 p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="dot dot-busy animate-pulse" />
            <div>
              <div className="font-display text-xl">
                Currently printing: {inProgress.jobName}
              </div>
              <div className="text-sm text-muted-foreground font-mono">
                {inProgress.printer.name} · started{' '}
                {inProgress.actualStart &&
                  formatDistanceToNow(new Date(inProgress.actualStart), { addSuffix: true })}
              </div>
            </div>
          </div>
          <Button asChild variant="default">
            <Link href={`/reserve/${inProgress._id}`}>Manage session</Link>
          </Button>
        </Card>
      )}

      {/* Two columns: upcoming + fleet */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl tracking-tight">Upcoming</h2>
            <Link
              href="/history"
              className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {upcoming.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground text-sm mb-4">No upcoming reservations.</p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/reserve">Reserve a printer</Link>
                </Button>
              </Card>
            ) : (
              upcoming.map((r) => <ReservationRow key={r._id} r={r} />)
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl tracking-tight">Fleet status</h2>
            <Link
              href="/printers"
              className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              All printers →
            </Link>
          </div>
          <div className="space-y-2">
            {printers.slice(0, 5).map((p) => (
              <PrinterRow key={p._id} p={p} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatRow({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-md border border-border p-1.5 text-muted-foreground">{icon}</div>
      <div className="font-display text-2xl numeric leading-none">{value}</div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function ReservationRow({ r }: { r: Reservation }) {
  return (
    <Card className="p-4 flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{r.jobName}</div>
        <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">
          {r.printer.name} · {format(new Date(r.scheduledStart), 'd MMM · HH:mm')} ·{' '}
          {formatHours(r.scheduledHours)}
        </div>
      </div>
      <Badge variant={r.status === 'reserved' ? 'outline' : 'secondary'}>
        {r.status.replace('_', ' ')}
      </Badge>
    </Card>
  );
}

function PrinterRow({ p }: { p: Printer }) {
  return (
    <Card className="p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={
            p.status === 'available'
              ? 'dot dot-available'
              : p.status === 'in_use'
                ? 'dot dot-busy'
                : 'dot dot-maintenance'
          }
        />
        <div className="min-w-0">
          <div className="font-medium truncate">{p.name}</div>
          <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {p.modelName} · {p.type}
          </div>
        </div>
      </div>
      <Badge
        variant={
          p.status === 'available' ? 'success' : p.status === 'in_use' ? 'danger' : 'warning'
        }
      >
        {p.status.replace('_', ' ')}
      </Badge>
    </Card>
  );
}
