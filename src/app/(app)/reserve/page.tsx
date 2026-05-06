'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
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
import { format } from 'date-fns';
import { Upload, X, FileBox } from 'lucide-react';

const ModelViewer = dynamic(() => import('@/components/model-viewer'), { ssr: false, loading: () => null });

export default function ReservePage() {
  const router = useRouter();
  const { toast } = useToast();
  const user = useAuth((s) => s.user);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const [printerId, setPrinterId] = useState('');
  const [jobName, setJobName] = useState('');
  const [filamentType, setFilamentType] = useState('');
  const [scheduledStart, setScheduledStart] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [modelFile, setModelFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Set today's date only on the client to avoid SSR/hydration mismatch
  useEffect(() => {
    if (!scheduledStart) setScheduledStart(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const handleFileSelect = (file: File) => {
    const allowed = ['.stl', '.obj', '.3mf', '.amf'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      toast({ title: 'ไฟล์ไม่รองรับ', description: `รองรับ: ${allowed.join(', ')}`, variant: 'destructive' });
      return;
    }
    setModelFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      let fileUrl: string | undefined;
      let modelFileName: string | undefined;

      if (modelFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append('model', modelFile);
        const { data } = await api.post('/files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        fileUrl = data.url;
        modelFileName = data.originalName;
        setUploading(false);
      }

      await api.post('/reservations', {
        printerId,
        jobName,
        filamentType: filamentType || undefined,
        scheduledStart: new Date(scheduledStart).toISOString(),
        scheduledHours: 1,
        fileUrl,
        modelFileName,
      });

      toast({ title: 'จองสำเร็จ', description: 'ระบบบันทึกการจองแล้ว', variant: 'success' });
      router.push('/dashboard');
    } catch (err: any) {
      toast({
        title: 'จองไม่สำเร็จ',
        description: err.response?.data?.message || 'ลองเวลาอื่น',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-10">
        <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          § Reserve
        </span>
        <h1 className="mt-2 font-display text-5xl tracking-tight">Book a session.</h1>
        <p className="mt-2 text-muted-foreground">
          เลือกเครื่อง เลือกวัน อัปโหลดโมเดล 3D แล้วยืนยัน
        </p>
      </div>

      <Card className="p-8">
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Printer */}
          <div className="space-y-2">
            <Label htmlFor="printer">Printer</Label>
            <Select value={printerId} onValueChange={setPrinterId}>
              <SelectTrigger id="printer">
                <SelectValue placeholder="เลือกเครื่องพิมพ์ FDM" />
              </SelectTrigger>
              <SelectContent>
                {fdmPrinters.map((p) => (
                  <SelectItem key={p._id} value={p._id} disabled={p.status === 'maintenance'}>
                    {p.name} {p.status === 'maintenance' && '· maintenance'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Job name */}
          <div className="space-y-2">
            <Label htmlFor="jobName">ชื่องาน / โปรเจกต์</Label>
            <Input
              id="jobName"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              placeholder="Robot chassis v2"
              required
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>วันที่จอง</Label>
            <Input
              type="date"
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
              required
            />
          </div>

          {/* Filament type */}
          <div className="space-y-2">
            <Label>ชนิดเส้นพลาสติก (Filament)</Label>
            <Select value={filamentType} onValueChange={setFilamentType}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {filamentTypes.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3D Model Upload */}
          <div className="space-y-3">
            <Label>ไฟล์โมเดล 3D (optional)</Label>

            {!modelFile ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative flex flex-col items-center justify-center gap-3
                  rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all
                  ${isDragOver
                    ? 'border-purple-400 bg-purple-50'
                    : 'border-border hover:border-purple-300 hover:bg-purple-50/30'
                  }
                `}
              >
                <div className="rounded-full bg-purple-100 p-3">
                  <Upload className="h-5 w-5 text-purple-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">ลากไฟล์มาวางที่นี่ หรือคลิกเลือก</p>
                  <p className="text-xs text-muted-foreground mt-1">.STL · .OBJ · .3MF · .AMF (สูงสุด 100 MB)</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".stl,.obj,.3mf,.amf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50/50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <FileBox className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium">{modelFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(modelFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setModelFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* 3D Preview — shows X/Y/Z dimensions */}
                <ModelViewer file={modelFile} />
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="rounded-lg border border-dashed border-border p-4 bg-secondary/30 space-y-1.5 font-mono text-xs">
            <Row label="วันที่" value={
              scheduledStart
                ? format(new Date(scheduledStart), 'd MMM yyyy')
                : '—'
            } />
            {filamentType && <Row label="Filament" value={filamentType} />}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" size="lg" disabled={submitting || !printerId}>
              {uploading ? 'กำลังอัปโหลด…' : submitting ? 'กำลังจอง…' : 'ยืนยันการจอง'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              ยกเลิก
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
