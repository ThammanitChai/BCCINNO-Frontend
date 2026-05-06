'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Reservation, Printer } from '@/lib/api';
import { useAuth } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, CheckCircle, X, MessageCircle, Send } from 'lucide-react';

const STATUS_LABEL: Record<string, string> = {
  pending_review: 'รอ Admin ตรวจสอบ',
  pending_confirmation: 'รอนักเรียนยืนยัน',
  confirmed: 'ยืนยันแล้ว รอปริ้น',
  in_progress: 'กำลังปริ้น',
  completed: 'เสร็จแล้ว',
  cancelled: 'ยกเลิก',
};

const STATUS_VARIANT: Record<string, 'secondary' | 'danger' | 'success' | 'outline' | 'default'> = {
  pending_review: 'secondary',
  pending_confirmation: 'default',
  confirmed: 'secondary',
  in_progress: 'danger',
  completed: 'success',
  cancelled: 'outline',
};

const PRINTER_TYPE_LABEL: Record<string, string> = {
  FDM_open: 'FDM ระบบเปิด',
  FDM_closed: 'FDM ระบบปิด',
  Resin: 'เลซิน (Resin)',
};

export default function ReservationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const refreshUser = useAuth((s) => s.refreshUser);

  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [comment, setComment] = useState('');

  const { data: reservation, isLoading } = useQuery({
    queryKey: ['reservation', params.id],
    queryFn: async () => (await api.get<Reservation>(`/reservations/${params.id}`)).data,
  });

  const { data: printers = [] } = useQuery({
    queryKey: ['printers'],
    queryFn: async () => (await api.get<Printer[]>('/printers')).data,
    enabled: reservation?.status === 'pending_confirmation',
  });

  const availablePrinters = printers.filter((p) => {
    if (!reservation) return false;
    const typeMatch =
      reservation.printerType === 'FDM_open' ? p.type === 'FDM_open' :
      reservation.printerType === 'FDM_closed' ? p.type === 'FDM_closed' :
      p.type === 'Resin';
    return typeMatch && p.status !== 'maintenance';
  });

  const confirmOrder = useMutation({
    mutationFn: () => api.post(`/reservations/${params.id}/confirm`, { printerId: selectedPrinter }),
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['reservation', params.id] });
      qc.invalidateQueries({ queryKey: ['reservations', 'mine'] });
      await refreshUser();
      toast({ title: 'ยืนยันแล้ว', description: 'Admin จะเริ่มปริ้นเร็วๆ นี้', variant: 'success' });
    },
    onError: (err: any) => toast({ title: 'ยืนยันไม่ได้', description: err.response?.data?.message, variant: 'destructive' }),
  });


  const cancel = useMutation({
    mutationFn: () => api.post(`/reservations/${params.id}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations', 'mine'] });
      toast({ title: 'ยกเลิกแล้ว', variant: 'success' });
      router.push('/history');
    },
    onError: (err: any) => toast({ title: 'ยกเลิกไม่ได้', description: err.response?.data?.message, variant: 'destructive' }),
  });

  const addComment = useMutation({
    mutationFn: () => api.post(`/reservations/${params.id}/comment`, { message: comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservation', params.id] });
      setComment('');
    },
    onError: (err: any) => toast({ title: 'ส่งข้อความไม่ได้', description: err.response?.data?.message, variant: 'destructive' }),
  });

  if (isLoading) return <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">··· loading ···</div>;
  if (!reservation) return <div>Not found</div>;

  const canCancel = ['pending_review', 'pending_confirmation'].includes(reservation.status);

  return (
    <div className="max-w-3xl space-y-8">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-3">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">§ Project</span>
          <Badge variant={STATUS_VARIANT[reservation.status] ?? 'secondary'}>
            {STATUS_LABEL[reservation.status] ?? reservation.status}
          </Badge>
        </div>
        <h1 className="font-display text-5xl tracking-tight">{reservation.jobName}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {format(new Date(reservation.createdAt), 'd MMM yyyy')} · {PRINTER_TYPE_LABEL[reservation.printerType]}
        </p>
      </div>

      {/* Details */}
      <Card className="p-6">
        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
          <Item label="ประเภทเครื่อง" value={PRINTER_TYPE_LABEL[reservation.printerType]} />
          <Item label="วันที่ต้องการ" value={format(new Date(reservation.scheduledStart), 'd MMM yyyy')} />
          {reservation.filamentType && <Item label="Filament" value={reservation.filamentType} />}
          {reservation.infillPercent != null && <Item label="Infill" value={`${reservation.infillPercent}%`} />}
          {reservation.printer && <Item label="เครื่องพิมพ์" value={reservation.printer.name} />}
          {reservation.estimatedHours != null && <Item label="เวลาประมาณ" value={`~${reservation.estimatedHours} ชม.`} />}
          {reservation.estimatedWeight != null && <Item label="น้ำหนักประมาณ" value={`~${reservation.estimatedWeight} g`} />}
          {reservation.hoursConsumed != null && reservation.hoursConsumed > 0 && (
            <Item label="เวลาปริ้นจริง" value={`${reservation.hoursConsumed} ชม.`} />
          )}
          {reservation.pickupTime && (
            <Item label="เวลามารับ" value={format(new Date(reservation.pickupTime), "d MMM yyyy · HH:mm 'น.'")} />
          )}
        </dl>
        {reservation.notes && (
          <div className="mt-5 pt-5 border-t border-border">
            <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">หมายเหตุ</dt>
            <dd className="text-sm">{reservation.notes}</dd>
          </div>
        )}
      </Card>

      {/* Student files */}
      {reservation.files.length > 0 && (
        <div className="space-y-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">§ ไฟล์ที่ส่ง</span>
          <div className="grid gap-2">
            {reservation.files.map((f, i) => (
              <a key={i} href={f.url} target="_blank" rel="noreferrer"
                className="flex items-center gap-3 rounded-lg border border-purple-200 bg-purple-50/50 px-4 py-2.5 hover:bg-purple-100/50 transition-colors">
                <span className="font-mono text-xs text-purple-700 flex-1 truncate">{f.originalName}</span>
                <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">ดาวน์โหลด →</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Slice images from admin */}
      {reservation.sliceImages.length > 0 && (
        <div className="space-y-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">§ Slice Preview จาก Admin</span>
          <div className="grid sm:grid-cols-2 gap-3">
            {reservation.sliceImages.map((img, i) => (
              <a key={i} href={img.url} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-purple-200 hover:opacity-90 transition-opacity">
                <img src={img.url} alt={img.originalName} className="w-full object-cover max-h-64" />
                <div className="px-3 py-2 bg-purple-50/50">
                  <span className="font-mono text-[10px] text-muted-foreground">{img.originalName}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Result photos */}
      {reservation.resultPhotos.length > 0 && (
        <div className="space-y-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">§ ผลงานที่ปริ้นแล้ว</span>
          <div className="grid sm:grid-cols-2 gap-3">
            {reservation.resultPhotos.map((img, i) => (
              <a key={i} href={img.url} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-green-200 hover:opacity-90 transition-opacity">
                <img src={img.url} alt={img.originalName} className="w-full object-cover max-h-64" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Confirm section */}
      {reservation.status === 'pending_confirmation' && (
        <Card className="p-6 space-y-4 border-purple-200">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-purple-600">§ ยืนยันการสั่งปริ้น</span>
            <p className="mt-2 text-sm text-muted-foreground">
              ตรวจสอบ slice ด้านบนแล้วเลือกเครื่องพิมพ์ที่ต้องการ
            </p>
          </div>
          <div className="space-y-2">
            <Label>เลือกเครื่องพิมพ์</Label>
            <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
              <SelectTrigger><SelectValue placeholder="เลือกเครื่อง" /></SelectTrigger>
              <SelectContent>
                {availablePrinters.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name} · {p.modelName}
                    {p.status === 'in_use' && ' · (กำลังใช้งาน)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => confirmOrder.mutate()}
              disabled={confirmOrder.isPending || !selectedPrinter}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              {confirmOrder.isPending ? 'กำลังยืนยัน…' : 'ยืนยันสั่งปริ้น'}
            </Button>
          </div>
        </Card>
      )}

      {/* Comments */}
      <div className="space-y-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          § ข้อความ / แชท
        </span>

        {reservation.comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">ยังไม่มีข้อความ</p>
        ) : (
          <div className="space-y-3">
            {reservation.comments.map((c, i) => {
              const isMe = (c.from === 'student' && user?.role !== 'admin') || (c.from === 'admin' && user?.role === 'admin');
              return (
                <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-sm rounded-2xl px-4 py-3 ${
                    c.from === 'admin' ? 'bg-purple-100 text-purple-900' : 'bg-secondary'
                  }`}>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1">
                      {c.from === 'admin' ? 'Admin' : 'คุณ'}
                    </p>
                    <p className="text-sm">{c.message}</p>
                    <p className="font-mono text-[9px] text-muted-foreground/50 mt-1">
                      {format(new Date(c.createdAt), 'd MMM HH:mm')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Input */}
        {!['completed', 'cancelled'].includes(reservation.status) && (
          <div className="flex gap-2">
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="พิมพ์ข้อความ…"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && comment.trim()) { e.preventDefault(); addComment.mutate(); } }}
            />
            <Button
              type="button"
              onClick={() => addComment.mutate()}
              disabled={addComment.isPending || !comment.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Cancel */}
      {canCancel && (
        <div className="pb-8">
          <Button variant="ghost" onClick={() => { if (window.confirm('ยกเลิกการจองนี้?')) cancel.mutate(); }} disabled={cancel.isPending} className="gap-2 text-destructive hover:text-destructive">
            <X className="h-4 w-4" /> ยกเลิกการจอง
          </Button>
        </div>
      )}
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
