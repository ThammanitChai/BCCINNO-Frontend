'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { trackLabel } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Users, CheckCircle2, Activity, Database } from 'lucide-react';

interface OverviewStats {
  totalUsers: number;
  activeUsers: number;
  totalReservations: number;
  completedToday: number;
  printerUsage: Array<{
    _id: string;
    totalHours: number;
    jobs: number;
    printer: { name: string };
  }>;
  trackUsage: Array<{ _id: string; users: number; totalHoursUsed: number }>;
}

const ACCENT_COLORS = ['#0F2547', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#06B6D4'];

export default function AdminOverviewPage() {
  const { data } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => (await api.get<OverviewStats>('/reservations/stats/overview')).data,
  });

  const printerData = (data?.printerUsage || []).map((p) => ({
    name: p.printer?.name?.replace('Bambu Lab ', '') || '—',
    hours: Number(p.totalHours.toFixed(1)),
    jobs: p.jobs,
  }));

  const trackData = (data?.trackUsage || []).map((t) => ({
    name: trackLabel(t._id),
    users: t.users,
    hours: Number(t.totalHoursUsed.toFixed(1)),
  }));

  return (
    <div className="space-y-10">
      <div className="border-b border-border pb-6">
        <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          § Administration
        </span>
        <h1 className="mt-2 font-display text-5xl tracking-tight">Lab overview.</h1>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          icon={<Users className="h-4 w-4" />}
          label="Members"
          value={data?.totalUsers ?? '—'}
          sub={`${data?.activeUsers ?? 0} active`}
        />
        <Kpi
          icon={<Activity className="h-4 w-4" />}
          label="Reservations"
          value={data?.totalReservations ?? '—'}
          sub="all-time"
        />
        <Kpi
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Completed today"
          value={data?.completedToday ?? '—'}
          sub="0 → now"
        />
        <Kpi
          icon={<Database className="h-4 w-4" />}
          label="Printers"
          value={data?.printerUsage?.length ?? '—'}
          sub="logged usage"
        />
      </section>

      {/* Charts */}
      <section className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl">Printer utilization</h2>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Hours logged
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={printerData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="hours" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-xl mb-6">Members by track</h2>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={trackData}
                  dataKey="users"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  stroke="none"
                >
                  {trackData.map((_, i) => (
                    <Cell key={i} fill={ACCENT_COLORS[i % ACCENT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {trackData.map((t, i) => (
              <div key={t.name} className="flex items-center justify-between text-xs font-mono">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: ACCENT_COLORS[i % ACCENT_COLORS.length] }}
                  />
                  {t.name}
                </span>
                <span className="numeric text-muted-foreground">
                  {t.users} · {t.hours}h
                </span>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <div className="rounded-md border border-border p-1.5 text-muted-foreground">
          {icon}
        </div>
      </div>
      <div className="font-display text-4xl numeric tracking-tight">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
        {sub}
      </div>
    </Card>
  );
}
