'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, Printer, Filament } from '@/lib/api';
import { useAuth } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toaster';
import { formatHours } from '@/lib/utils';
import { addHours, format } from 'date-fns';

export default function ReservePage() {
  const router = useRouter();
  const { toast } = useToast();
  const user = useAuth((s) => s.user);

  const { data: printers = [] } = useQuery({
    queryKey: ['printers'],
    queryFn: async () => (await api.get<Printer[]>('/printers')).data,
  });

  const { data: filaments = [] } = useQuery({
    queryKey: ['filaments'],
    queryFn: async () => (await api.get<Filament[]>('/filaments')).data,
  });

  const fdmPrinters = printers.filter((p) => p.type === 'FDM');
  const filamentTypes = useMemo(
    () => Array.from(new Set(filaments.filter((f) => !f.isDiscontinued).map((f) => f.type))),
    [filaments]
  );

  // Default datetime: next hour
  const defaultStart = format(
    new Date(Math.ceil(Date.now() / 3600000) * 3600000),
    "yyyy-MM-dd'T'HH:mm"
  );

  const [printerId, setPrinterId] = useState('');
  const [jobName, setJobName] = useState('');
  const [filamentType, setFilamentType] = useState('');
  const [filamentColor, setFilamentColor] = useState('');
  const [filamentWeight, setFilamentWeight] = useState('');
  const [scheduledStart, setScheduledStart] = useState(defaultStart);
  const [scheduledHours, setScheduledHours] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  const colorsForType = useMemo(
    () =>
      filaments
        .filter((f) => f.type === filamentType && !f.isDiscontinued)
        .map((f) => f.color),
    [filamentType, filaments]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const hours = parseFloat(scheduledHours);
    if (hours > user.hoursRemaining) {
      toast({
        title: 'Not enough hours',
        description: `You only have ${formatHours(user.hoursRemaining)} remaining`,
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/reservations', {
        printerId,
        jobName,
        filamentType: filamentType || undefined,
        filamentColor: filamentColor || undefined,
        filamentWeight: filamentWeight ? parseFloat(filamentWeight) : undefined,
        scheduledStart: new Date(scheduledStart).toISOString(),
        scheduledHours: hours,
      });
      toast({
        title: 'Reservation confirmed',
        description: 'Your slot is booked',
        variant: 'success',
      });
      router.push('/dashboard');
    } catch (err: any) {
      toast({
        title: 'Reservation failed',
        description: err.response?.data?.message || 'Try a different time slot',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const endTime = scheduledStart && scheduledHours
    ? addHours(new Date(scheduledStart), parseFloat(scheduledHours) || 0)
    : null;

  return (
    <div className="max-w-3xl">
      <div className="mb-10">
        <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          § Reserve
        </span>
        <h1 className="mt-2 font-display text-5xl tracking-tight">Book a session.</h1>
        <p className="mt-2 text-muted-foreground">
          Select a printer, choose a time, and we&apos;ll lock the slot for you.
        </p>
      </div>

      <Card className="p-8">
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="printer">Printer</Label>
            <Select value={printerId} onValueChange={setPrinterId}>
              <SelectTrigger id="printer">
                <SelectValue placeholder="Select an FDM printer" />
              </SelectTrigger>
              <SelectContent>
                {fdmPrinters.map((p) => (
                  <SelectItem
                    key={p._id}
                    value={p._id}
                    disabled={p.status === 'maintenance'}
                  >
                    {p.name} {p.status === 'maintenance' && '· maintenance'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobName">Job name / project</Label>
            <Input
              id="jobName"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              placeholder="Robot chassis v2"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ftype">Filament type</Label>
              <Select value={filamentType} onValueChange={(v) => { setFilamentType(v); setFilamentColor(''); }}>
                <SelectTrigger id="ftype">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {filamentTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fcolor">Color</Label>
              <Select value={filamentColor} onValueChange={setFilamentColor} disabled={!filamentType}>
                <SelectTrigger id="fcolor">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {colorsForType.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (g)</Label>
              <Input
                id="weight"
                type="number"
                min="0"
                step="0.1"
                value={filamentWeight}
                onChange={(e) => setFilamentWeight(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start">Start time</Label>
              <Input
                id="start"
                type="datetime-local"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours">Estimated hours</Label>
              <Input
                id="hours"
                type="number"
                min="0.5"
                max="48"
                step="0.5"
                value={scheduledHours}
                onChange={(e) => setScheduledHours(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-md border border-dashed border-border p-4 bg-secondary/40 space-y-2 font-mono text-xs">
            <Row label="Window" value={
              endTime
                ? `${format(new Date(scheduledStart), 'd MMM, HH:mm')} → ${format(endTime, 'HH:mm')}`
                : '—'
            } />
            <Row label="Duration" value={formatHours(parseFloat(scheduledHours) || 0)} />
            <Row label="Hours after this" value={
              user
                ? formatHours(Math.max(0, user.hoursRemaining - (parseFloat(scheduledHours) || 0)))
                : '—'
            } />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" size="lg" disabled={submitting || !printerId}>
              {submitting ? 'Reserving…' : 'Confirm reservation'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between uppercase tracking-wider">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
