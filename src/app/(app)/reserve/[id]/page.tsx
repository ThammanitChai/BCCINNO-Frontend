'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Reservation } from '@/lib/api';
import { useAuth } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toaster';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { formatHours } from '@/lib/utils';
import { ArrowLeft, Play, Square, X } from 'lucide-react';

export default function ReservationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const refreshUser = useAuth((s) => s.refreshUser);

  const { data: reservation, isLoading } = useQuery({
    queryKey: ['reservation', params.id],
    queryFn: async () => {
      const all = (await api.get<Reservation[]>('/reservations')).data;
      return all.find((r) => r._id === params.id);
    },
  });

  const checkIn = useMutation({
    mutationFn: () => api.post(`/reservations/${params.id}/check-in`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservation', params.id] });
      qc.invalidateQueries({ queryKey: ['reservations', 'mine'] });
      qc.invalidateQueries({ queryKey: ['printers'] });
      toast({ title: 'Checked in', variant: 'success' });
    },
    onError: (err: any) => {
      toast({
        title: 'Check-in failed',
        description: err.response?.data?.message,
        variant: 'destructive',
      });
    },
  });

  const checkOut = useMutation({
    mutationFn: () => api.post(`/reservations/${params.id}/check-out`),
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['reservation', params.id] });
      qc.invalidateQueries({ queryKey: ['reservations', 'mine'] });
      qc.invalidateQueries({ queryKey: ['printers'] });
      await refreshUser();
      toast({ title: 'Checked out', description: 'Your hours have been logged', variant: 'success' });
    },
  });

  const cancel = useMutation({
    mutationFn: () => api.post(`/reservations/${params.id}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations', 'mine'] });
      toast({ title: 'Reservation cancelled', variant: 'success' });
      router.push('/dashboard');
    },
  });

  if (isLoading) {
    return <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">··· loading ···</div>;
  }
  if (!reservation) {
    return <div>Not found</div>;
  }

  return (
    <div className="max-w-3xl space-y-8">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-3">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            § Session
          </span>
          <Badge
            variant={
              reservation.status === 'in_progress'
                ? 'danger'
                : reservation.status === 'completed'
                  ? 'success'
                  : reservation.status === 'cancelled'
                    ? 'outline'
                    : 'secondary'
            }
          >
            {reservation.status.replace('_', ' ')}
          </Badge>
        </div>
        <h1 className="font-display text-5xl tracking-tight">{reservation.jobName}</h1>
      </div>

      <Card className="p-8">
        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
          <Item label="Printer" value={reservation.printer.name} />
          <Item
            label="Scheduled start"
            value={format(new Date(reservation.scheduledStart), "d MMM yyyy · HH:mm 'น.'")}
          />
          <Item label="Estimated duration" value={formatHours(reservation.scheduledHours)} />
          <Item
            label="Filament"
            value={
              reservation.filamentType
                ? `${reservation.filamentType} · ${reservation.filamentColor || '—'} · ${
                    reservation.filamentWeight ? `${reservation.filamentWeight}g` : '—'
                  }`
                : '—'
            }
          />
          {reservation.actualStart && (
            <Item
              label="Started"
              value={format(new Date(reservation.actualStart), "HH:mm 'น.' · d MMM")}
            />
          )}
          {reservation.actualEnd && (
            <Item
              label="Ended"
              value={format(new Date(reservation.actualEnd), "HH:mm 'น.' · d MMM")}
            />
          )}
          {reservation.hoursConsumed != null && reservation.hoursConsumed > 0 && (
            <Item label="Hours consumed" value={formatHours(reservation.hoursConsumed)} />
          )}
        </dl>
      </Card>

      <div className="flex flex-wrap gap-3">
        {reservation.status === 'reserved' && (
          <>
            <Button onClick={() => checkIn.mutate()} disabled={checkIn.isPending}>
              <Play className="h-4 w-4" />
              Check in
            </Button>
            <Button variant="ghost" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
              <X className="h-4 w-4" />
              Cancel reservation
            </Button>
          </>
        )}

        {reservation.status === 'in_progress' && (
          <Button
            variant="destructive"
            onClick={() => checkOut.mutate()}
            disabled={checkOut.isPending}
          >
            <Square className="h-4 w-4" />
            Check out
          </Button>
        )}
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
        {label}
      </dt>
      <dd className="text-base">{value}</dd>
    </div>
  );
}
