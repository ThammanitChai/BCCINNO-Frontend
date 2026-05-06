'use client';

import { useState, useRef } from 'react';
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
import {
  ArrowLeft, Upload, Play, Square, CheckCircle, X, Send, Clock, PackageCheck, Image as ImageIcon,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const ModelViewer = dynamic(() => import('@/components/model-viewer'), { ssr: false });

const STATUS_LABEL: Record<string, string> = {
  pending_review: 'รอ Admin ตรวจสอบ',
  pending_confirmation: 'รอนักเรียนยืนยัน',
  confirmed: 'ยืนยันแล้ว รอปริ้น',
  in_progress: 'กำลังปริ้น',
  completed: 'เสร็จแล้ว',
  cancelled: 'ยกเลิก',
};

const PRINTER_TYPE_LABEL: Record<string, string> = {
  FDM_open: 'FDM ระบบเปิด',
  FDM_closed: 'FDM ระบบปิด',
  Resin: 'เลซิน (Resin)',
};

export default function AdminReservationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const sliceInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Slice form
  const [estimatedHours, setEstimatedHours] = useState('');
  const [estimatedWeight, setEstimatedWeight] = useState('');
  const [sliceFiles, setSliceFiles] = useState<File[]>([]);
  const [uploadingSlice, setUploadingSlice] = useState(false);

  // Complete form
  const [hoursConsumed, setHoursConsumed] = useState('');
  const [resultFiles, setResultFiles] = useState<File[]>([]);
  const [pickupTime, setPickupTime] = useState('');
  const [uploadingResult, setUploadingResult] = useState(false);

  // Notes / admin edits
  const [notes, setNotes] = useState('');
  const [commentMsg, setCommentMsg] = useState('');

  const { data: reservation, isLoading } = useQuery({
    queryKey: ['admin', 'reservation', params.id],
    queryFn: async () => {
      const r = (await api.get<Reservation>(`/reservations/${params.id}`)).data;
      setNotes(r.notes ?? '');
      setHoursConsumed(r.hoursConsumed ? String(r.hoursConsumed) : '');
      setPickupTime(r.pickupTime ? format(new Date(r.pickupTime), "yyyy-MM-dd'T'HH:mm") : '');
      setEstimatedHours(r.estimatedHours ? String(r.estimatedHours) : '');
      setEstimatedWeight(r.estimatedWeight ? String(r.estimatedWeight) : '');
      return r;
    },
  });

  async function uploadToServer(file: File) {
    const fd = new FormData();
    fd.append('model', file);
    const { data } = await api.post('/files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return { url: data.url, originalName: data.originalName };
  }

  const sendSlice = useMutation({
    mutationFn: async () => {
      if (!sliceFiles.length) throw new Error('เลือกรูป slice ก่อน');
      setUploadingSlice(true);
      const sliceImages = await Promise.all(sliceFiles.map(uploadToServer));
      setUploadingSlice(false);
      return api.post(`/reservations/${params.id}/slice`, {
        sliceImages,
        estimatedHours: parseFloat(estimatedHours),
        estimatedWeight: estimatedWeight ? parseFloat(estimatedWeight) : undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reservation', params.id] });
      setSliceFiles([]);
      toast({ title: 'ส่ง slice ให้นักเรียนแล้ว', variant: 'success' });
    },
    onError: (err: any) => { setUploadingSlice(false); toast({ title: 'Error', description: err.response?.data?.message || err.message, variant: 'destructive' }); },
  });

  const startPrint = useMutation({
    mutationFn: () => api.post(`/reservations/${params.id}/start-print`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'reservation', params.id] }); toast({ title: 'เริ่มปริ้นแล้ว', variant: 'success' }); },
    onError: (err: any) => toast({ title: 'Error', description: err.response?.data?.message, variant: 'destructive' }),
  });

  const complete = useMutation({
    mutationFn: async () => {
      setUploadingResult(true);
      const resultPhotos = resultFiles.length ? await Promise.all(resultFiles.map(uploadToServer)) : [];
      setUploadingResult(false);
      return api.post(`/reservations/${params.id}/complete`, {
        hoursConsumed: parseFloat(hoursConsumed),
        resultPhotos,
        pickupTime: pickupTime ? new Date(pickupTime).toISOString() : undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reservation', params.id] });
      qc.invalidateQueries({ queryKey: ['admin', 'reservations'] });
      setResultFiles([]);
      toast({ title: 'ปริ้นเสร็จแล้ว ตัดเวลาแล้ว', variant: 'success' });
    },
    onError: (err: any) => { setUploadingResult(false); toast({ title: 'Error', description: err.response?.data?.message, variant: 'destructive' }); },
  });

  const cancel = useMutation({
    mutationFn: () => api.post(`/reservations/${params.id}/cancel`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'reservation', params.id] }); toast({ title: 'ยกเลิกแล้ว', variant: 'success' }); },
    onError: (err: any) => toast({ title: 'Error', description: err.response?.data?.message, variant: 'destructive' }),
  });

  const saveNotes = useMutation({
    mutationFn: () => api.patch(`/reservations/${params.id}`, { notes: notes || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'reservation', params.id] }); toast({ title: 'บันทึกแล้ว', variant: 'success' }); },
    onError: (err: any) => toast({ title: 'Error', description: err.response?.data?.message, variant: 'destructive' }),
  });

  const addComment = useMutation({
    mutationFn: () => api.post(`/reservations/${params.id}/comment`, { message: commentMsg }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'reservation', params.id] }); setCommentMsg(''); },
    onError: (err: any) => toast({ title: 'Error', description: err.response?.data?.message, variant: 'destructive' }),
  });

  const sendPrint = useMutation({
    mutationFn: () => api.post(`/printers/${reservation!.printer!._id}/print`, {
      jobName: reservation!.jobName,
      fileUrl: reservation!.files[0]?.url ?? '',
    }),
    onSuccess: () => toast({ title: 'ส่งคำสั่งปริ้นแล้ว', variant: 'success' }),
    onError: (err: any) => toast({ title: 'Print failed', description: err.response?.data?.message, variant: 'destructive' }),
  });

  if (isLoading) return <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">··· loading ···</div>;
  if (!reservation) return <div>Not found</div>;

  const hasBambu = !!(reservation.printer?.bambuIp && reservation.printer?.bambuSerial);

  return (
    <div className="max-w-4xl space-y-8">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-3">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">§ Admin · Job</span>
          <Badge variant={
            reservation.status === 'completed' ? 'success'
              : reservation.status === 'in_progress' ? 'danger'
                : reservation.status === 'cancelled' ? 'outline' : 'secondary'
          }>
            {STATUS_LABEL[reservation.status] ?? reservation.status}
          </Badge>
        </div>
        <h1 className="font-display text-5xl tracking-tight">{reservation.jobName}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {reservation.user.firstName} {reservation.user.lastName} · {reservation.user.studentId}
        </p>
      </div>

      {/* Details */}
      <Card className="p-8">
        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
          <Item label="ประเภทเครื่อง" value={PRINTER_TYPE_LABEL[reservation.printerType] ?? reservation.printerType} />
          <Item label="วันที่ต้องการ" value={format(new Date(reservation.scheduledStart), 'd MMM yyyy')} />
          {reservation.filamentType && <Item label="Filament" value={reservation.filamentType} />}
          {reservation.infillPercent != null && <Item label="Infill" value={`${reservation.infillPercent}%`} />}
          {reservation.printer && <Item label="เครื่องพิมพ์" value={reservation.printer.name} />}
          {reservation.estimatedHours != null && <Item label="เวลาประมาณ" value={`${reservation.estimatedHours} ชม.`} />}
          {reservation.estimatedWeight != null && <Item label="น้ำหนักประมาณ" value={`${reservation.estimatedWeight} g`} />}
          {reservation.hoursConsumed != null && reservation.hoursConsumed > 0 && (
            <Item label="เวลาจริง" value={`${reservation.hoursConsumed} ชม.`} />
          )}
          {reservation.pickupTime && (
            <Item label="เวลามารับ" value={format(new Date(reservation.pickupTime), "d MMM yyyy · HH:mm 'น.'")} />
          )}
          {reservation.notes && (
            <div className="sm:col-span-2">
              <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">หมายเหตุ</dt>
              <dd className="text-sm">{reservation.notes}</dd>
            </div>
          )}
        </dl>
      </Card>

      {/* Student files */}
      {reservation.files.length > 0 && (
        <div className="space-y-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">§ ไฟล์จากนักเรียน</span>
          <div className="grid gap-2">
            {reservation.files.map((f, i) => {
              const isViewable = /\.(stl|obj)$/i.test(f.originalName);
              return (
                <div key={i} className="space-y-2">
                  <a href={f.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-purple-200 bg-purple-50/50 px-4 py-2.5 hover:bg-purple-100/50 transition-colors">
                    <span className="font-mono text-xs text-purple-700 flex-1 truncate">{f.originalName}</span>
                    <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">ดาวน์โหลด →</span>
                  </a>
                  {isViewable && <ModelViewer fileUrl={f.url} fileName={f.originalName} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STEP 1: Admin slice ─────────────────────────────────────────────── */}
      {['pending_review', 'pending_confirmation'].includes(reservation.status) && (
        <Card className="p-8 space-y-6">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">§ Step 1 · Slice</span>
            <h2 className="mt-1 font-display text-2xl tracking-tight">ส่ง Slice ให้นักเรียน</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-purple-500" />เวลาปริ้นประมาณ (ชม.)</Label>
              <Input type="number" min="0" step="0.5" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} placeholder="2.5" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><PackageCheck className="h-3.5 w-3.5 text-purple-500" />น้ำหนักเส้น (g)</Label>
              <Input type="number" min="0" step="0.1" value={estimatedWeight} onChange={(e) => setEstimatedWeight(e.target.value)} placeholder="45" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><ImageIcon className="h-3.5 w-3.5 text-purple-500" />แนบรูป Slice (แคปจอจาก Bambu Studio)</Label>
            <div
              onClick={() => sliceInputRef.current?.click()}
              className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-6 cursor-pointer hover:border-purple-300 hover:bg-purple-50/30 transition-all"
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">คลิกเลือกรูป (หลายรูปได้) · JPG, PNG</p>
              <input ref={sliceInputRef} type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => { if (e.target.files) setSliceFiles((p) => [...p, ...Array.from(e.target.files!)]); }} />
            </div>
            {sliceFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {sliceFiles.map((f, i) => (
                  <div key={i} className="relative rounded-lg overflow-hidden border border-purple-200 w-24 h-24">
                    <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setSliceFiles((p) => p.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5 text-white">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Existing slice images */}
            {reservation.sliceImages.length > 0 && (
              <div className="mt-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">รูปที่ส่งไปแล้ว</p>
                <div className="flex flex-wrap gap-2">
                  {reservation.sliceImages.map((img, i) => (
                    <a key={i} href={img.url} target="_blank" rel="noreferrer" className="rounded-lg overflow-hidden border border-purple-200 w-24 h-24 block">
                      <img src={img.url} alt={img.originalName} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Button onClick={() => sendSlice.mutate()} disabled={sendSlice.isPending || uploadingSlice || !estimatedHours || !sliceFiles.length} className="gap-2">
            <Send className="h-4 w-4" />
            {uploadingSlice ? 'กำลังอัปโหลด…' : sendSlice.isPending ? 'กำลังส่ง…' : 'ส่ง Slice ให้นักเรียน'}
          </Button>
        </Card>
      )}

      {/* ── STEP 2: Start printing ──────────────────────────────────────────── */}
      {reservation.status === 'confirmed' && (
        <Card className="p-8 space-y-4">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">§ Step 2 · ปริ้น</span>
            <h2 className="mt-1 font-display text-2xl tracking-tight">เริ่มปริ้น</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            นักเรียนยืนยันแล้ว เครื่อง:{' '}
            <span className="font-mono font-medium text-foreground">{reservation.printer?.name ?? '—'}</span>
          </p>
          <div className="flex gap-3">
            <Button onClick={() => startPrint.mutate()} disabled={startPrint.isPending} className="gap-2">
              <Play className="h-4 w-4" />
              {startPrint.isPending ? 'กำลังอัปเดต…' : 'เริ่มปริ้น'}
            </Button>
            {hasBambu && reservation.files.length > 0 && (
              <Button variant="outline" onClick={() => sendPrint.mutate()} disabled={sendPrint.isPending} className="gap-2">
                ส่งคำสั่ง Bambu Lab
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* ── STEP 3: Complete ────────────────────────────────────────────────── */}
      {reservation.status === 'in_progress' && (
        <Card className="p-8 space-y-6">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">§ Step 3 · เสร็จแล้ว</span>
            <h2 className="mt-1 font-display text-2xl tracking-tight">บันทึกผลและตัดเวลา</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-purple-500" />เวลาปริ้นจริง (ชม.)</Label>
              <Input type="number" min="0" step="0.01" value={hoursConsumed} onChange={(e) => setHoursConsumed(e.target.value)} placeholder="2.5" />
              <p className="text-xs text-muted-foreground">จะตัดจากโควต้าของนักเรียน</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><PackageCheck className="h-3.5 w-3.5 text-purple-500" />กำหนดเวลามารับ</Label>
              <Input type="datetime-local" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><ImageIcon className="h-3.5 w-3.5 text-purple-500" />รูปถ่ายผลงาน (ส่งให้นักเรียน)</Label>
            <div
              onClick={() => photoInputRef.current?.click()}
              className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-5 cursor-pointer hover:border-purple-300 hover:bg-purple-50/30 transition-all"
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">คลิกเลือกรูป · JPG, PNG</p>
              <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => { if (e.target.files) setResultFiles((p) => [...p, ...Array.from(e.target.files!)]); }} />
            </div>
            {resultFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {resultFiles.map((f, i) => (
                  <div key={i} className="relative rounded-lg overflow-hidden border border-border w-24 h-24">
                    <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setResultFiles((p) => p.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5 text-white">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button onClick={() => complete.mutate()} disabled={complete.isPending || uploadingResult || !hoursConsumed} className="gap-2">
            <CheckCircle className="h-4 w-4" />
            {uploadingResult ? 'กำลังอัปโหลด…' : complete.isPending ? 'กำลังบันทึก…' : 'ปริ้นเสร็จ + ตัดเวลา'}
          </Button>
        </Card>
      )}

      {/* Result photos (if completed) */}
      {reservation.status === 'completed' && reservation.resultPhotos.length > 0 && (
        <div className="space-y-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">§ รูปผลงาน</span>
          <div className="grid sm:grid-cols-2 gap-3">
            {reservation.resultPhotos.map((img, i) => (
              <a key={i} href={img.url} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-green-200">
                <img src={img.url} alt={img.originalName} className="w-full object-cover max-h-64" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Bambu print (if in_progress) */}
      {reservation.status === 'in_progress' && hasBambu && reservation.files.length > 0 && (
        <Card className="p-6 space-y-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">§ Bambu Lab</span>
          <Button onClick={() => sendPrint.mutate()} disabled={sendPrint.isPending} className="gap-2 bg-purple-600 hover:bg-purple-700">
            {sendPrint.isPending ? 'กำลังส่ง…' : 'ส่งคำสั่งปริ้น Bambu'}
          </Button>
        </Card>
      )}

      {/* Notes */}
      <Card className="p-8 space-y-4">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">§ Admin Notes</span>
        </div>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="หมายเหตุ admin…" />
        <Button size="sm" variant="outline" onClick={() => saveNotes.mutate()} disabled={saveNotes.isPending}>บันทึก</Button>
      </Card>

      {/* Comments */}
      <div className="space-y-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">§ ข้อความ / แชท</span>
        {reservation.comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">ยังไม่มีข้อความ</p>
        ) : (
          <div className="space-y-3">
            {reservation.comments.map((c, i) => (
              <div key={i} className={`flex ${c.from === 'admin' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-sm rounded-2xl px-4 py-3 ${c.from === 'admin' ? 'bg-purple-100 text-purple-900' : 'bg-secondary'}`}>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1">{c.from === 'admin' ? 'Admin (คุณ)' : 'นักเรียน'}</p>
                  <p className="text-sm">{c.message}</p>
                  <p className="font-mono text-[9px] text-muted-foreground/50 mt-1">{format(new Date(c.createdAt), 'd MMM HH:mm')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {!['completed', 'cancelled'].includes(reservation.status) && (
          <div className="flex gap-2">
            <Input value={commentMsg} onChange={(e) => setCommentMsg(e.target.value)} placeholder="พิมพ์ข้อความหา นักเรียน…"
              onKeyDown={(e) => { if (e.key === 'Enter' && commentMsg.trim()) { e.preventDefault(); addComment.mutate(); } }} />
            <Button type="button" onClick={() => addComment.mutate()} disabled={addComment.isPending || !commentMsg.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Cancel */}
      {!['completed', 'cancelled'].includes(reservation.status) && (
        <div className="pb-8">
          <Button variant="ghost" onClick={() => { if (window.confirm(`ยกเลิก "${reservation.jobName}"?`)) cancel.mutate(); }}
            disabled={cancel.isPending} className="gap-2 text-destructive hover:text-destructive">
            <X className="h-4 w-4" /> ยกเลิกงาน
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
