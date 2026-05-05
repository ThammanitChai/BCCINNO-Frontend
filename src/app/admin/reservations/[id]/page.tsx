'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Reservation } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toaster';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { formatHours } from '@/lib/utils';
import {
  ArrowLeft,
  Download,
  Play,
  Printer,
  Square,
  X,
  Clock,
  PackageCheck,
  Save,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const ModelViewer = dynamic(() => import('@/components/model-viewer'), { ssr: false });

export default function AdminReservationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: reservation, isLoading } = useQuery({
    queryKey: ['admin', 'reservation', params.id],
    queryFn: async () => (await api.get<Reservation>(`/reservations/${params.id}`)).data,
  });

  // Admin edit state
  const [hoursConsumed, setHoursConsumed] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!reservation) return;
    setHoursConsumed(reservation.hoursConsumed != null ? String(reservation.hoursConsumed) : '');
    setPickupTime(
      reservation.pickupTime
        ? format(new Date(reservation.pickupTime), "yyyy-MM-dd'T'HH:mm")
        : ''
    );
    setNotes(reservation.notes ?? '');
  }, [reservation]);

  const saveAdmin = useMutation({
    mutationFn: () =>
      api.patch(`/reservations/${params.id}`, {
        hoursConsumed: hoursConsumed ? parseFloat(hoursConsumed) : undefined,
        pickupTime: pickupTime ? new Date(pickupTime).toISOString() : null,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reservation', params.id] });
      qc.invalidateQueries({ queryKey: ['admin', 'reservations'] });
      toast({ title: 'บันทึกแล้ว', variant: 'success' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.response?.data?.message, variant: 'destructive' }),
  });

  const sendPrint = useMutation({
    mutationFn: () =>
      api.post(`/printers/${reservation!.printer._id}/print`, {
        jobName: reservation!.jobName,
        fileUrl: reservation!.fileUrl ?? '',
      }),
    onSuccess: () => toast({ title: 'ส่งคำสั่งปริ้นแล้ว', description: 'Bambu Lab ได้รับคำสั่ง', variant: 'success' }),
    onError: (err: any) => toast({ title: 'Print failed', description: err.response?.data?.message, variant: 'destructive' }),
  });

  const checkIn = useMutation({
    mutationFn: () => api.post(`/reservations/${params.id}/check-in`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reservation', params.id] });
      toast({ title: 'Checked in', variant: 'success' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.response?.data?.message, variant: 'destructive' }),
  });

  const checkOut = useMutation({
    mutationFn: () => api.post(`/reservations/${params.id}/check-out`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reservation', params.id] });
      toast({ title: 'Checked out', variant: 'success' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.response?.data?.message, variant: 'destructive' }),
  });

  const cancel = useMutation({
    mutationFn: () => api.post(`/reservations/${params.id}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reservation', params.id] });
      toast({ title: 'Cancelled', variant: 'success' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.response?.data?.message, variant: 'destructive' }),
  });

  if (isLoading) {
    return <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">··· loading ···</div>;
  }
  if (!reservation) {
    return <div>Not found</div>;
  }

  const hasBambu = !!(reservation.printer.bambuIp && reservation.printer.bambuSerial);

  return (
    <div className="max-w-4xl space-y-8">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-3">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">§ Session</span>
          <Badge
            variant={
              reservation.status === 'in_progress' ? 'danger'
                : reservation.status === 'completed' ? 'success'
                  : reservation.status === 'cancelled' ? 'outline'
                    : 'secondary'
            }
          >
            {reservation.status.replace('_', ' ')}
          </Badge>
        </div>
        <h1 className="font-display text-5xl tracking-tight">{reservation.jobName}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {reservation.user.firstName} {reservation.user.lastName} · {reservation.user.studentId}
        </p>
      </div>

      {/* Details card */}
      <Card className="p-8">
        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
          <Item label="Printer" value={reservation.printer.name} />
          <Item
            label="Scheduled start"
            value={format(new Date(reservation.scheduledStart), "d MMM yyyy · HH:mm 'น.'")}
          />
          <Item label="Estimated duration" value={formatHours(reservation.scheduledHours)} />
          {reservation.infillPercent != null && (
            <Item label="Infill" value={`${reservation.infillPercent}%`} />
          )}
          <Item
            label="Filament"
            value={
              reservation.filamentType
                ? `${reservation.filamentType} · ${reservation.filamentColor || '—'} · ${reservation.filamentWeight ? `${reservation.filamentWeight}g` : '—'}`
                : '—'
            }
          />
          {reservation.actualStart && (
            <Item label="Actual start" value={format(new Date(reservation.actualStart), "HH:mm 'น.' · d MMM")} />
          )}
          {reservation.actualEnd && (
            <Item label="Actual end" value={format(new Date(reservation.actualEnd), "HH:mm 'น.' · d MMM")} />
          )}
          {reservation.hoursConsumed != null && reservation.hoursConsumed > 0 && (
            <Item label="Hours consumed" value={formatHours(reservation.hoursConsumed)} />
          )}
          {reservation.pickupTime && (
            <Item label="Pickup time" value={format(new Date(reservation.pickupTime), "d MMM yyyy · HH:mm 'น.'")} />
          )}
          {reservation.notes && (
            <div className="sm:col-span-2">
              <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Notes</dt>
              <dd className="text-sm">{reservation.notes}</dd>
            </div>
          )}
        </dl>
      </Card>

      {/* 3D Model */}
      {reservation.fileUrl && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">§ 3D Model</span>
            <a href={reservation.fileUrl} download={reservation.modelFileName || 'model'} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-3.5 w-3.5" />
                {reservation.modelFileName || 'Download file'}
              </Button>
            </a>
          </div>
          <ModelViewer
            fileUrl={reservation.fileUrl}
            fileName={reservation.modelFileName}
          />
        </div>
      )}

      {/* Admin Edit Panel */}
      <Card className="p-8 space-y-6">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">§ Admin</span>
          <h2 className="mt-1 font-display text-2xl tracking-tight">แก้ไขข้อมูล</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-purple-500" />
              เวลาปริ้นจริง (ชั่วโมง)
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="เช่น 2.5"
              value={hoursConsumed}
              onChange={(e) => setHoursConsumed(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">ระบุเวลาจริงที่ใช้ปริ้น — จะอัปเดต hoursConsumed</p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <PackageCheck className="h-3.5 w-3.5 text-purple-500" />
              เวลามารับของ
            </Label>
            <Input
              type="datetime-local"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">แจ้งเวลาที่นักศึกษามารับงานปริ้นได้</p>
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label>หมายเหตุ (admin)</Label>
            <Input
              placeholder="ปัญหา, หมายเหตุพิเศษ..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <Button onClick={() => saveAdmin.mutate()} disabled={saveAdmin.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {saveAdmin.isPending ? 'กำลังบันทึก…' : 'บันทึก'}
        </Button>
      </Card>

      {/* Print Command */}
      {reservation.fileUrl && (
        <Card className="p-8 space-y-4">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">§ Bambu Lab</span>
            <h2 className="mt-1 font-display text-2xl tracking-tight">สั่งปริ้น</h2>
          </div>
          {hasBambu ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                ส่งคำสั่งไปที่ <span className="font-mono font-medium text-foreground">{reservation.printer.name}</span> ·{' '}
                <span className="font-mono text-xs">{reservation.printer.bambuIp}</span>
              </p>
              <Button
                onClick={() => sendPrint.mutate()}
                disabled={sendPrint.isPending || !reservation.fileUrl}
                className="gap-2 bg-purple-600 hover:bg-purple-700"
              >
                <Printer className="h-4 w-4" />
                {sendPrint.isPending ? 'กำลังส่ง…' : 'ส่งคำสั่งปริ้น'}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              เครื่องนี้ยังไม่ได้ตั้งค่า Bambu Lab credentials —{' '}
              <a href={`/admin/printers`} className="text-purple-600 underline">ตั้งค่าที่นี่</a>
            </p>
          )}
        </Card>
      )}

      {/* Status Actions */}
      <div className="flex flex-wrap gap-3 pb-8">
        {reservation.status === 'reserved' && (
          <>
            <Button onClick={() => checkIn.mutate()} disabled={checkIn.isPending} className="gap-2">
              <Play className="h-4 w-4" /> Check in
            </Button>
            <Button variant="ghost" onClick={() => cancel.mutate()} disabled={cancel.isPending} className="gap-2">
              <X className="h-4 w-4" /> Cancel
            </Button>
          </>
        )}
        {reservation.status === 'in_progress' && (
          <Button variant="destructive" onClick={() => checkOut.mutate()} disabled={checkOut.isPending} className="gap-2">
            <Square className="h-4 w-4" /> Check out
          </Button>
        )}
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</dt>
      <dd className="text-base">{value}</dd>
    </div>
  );
}
