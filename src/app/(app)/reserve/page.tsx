'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { api, Filament, PrinterType } from '@/lib/api';
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

const PRINTER_TYPES: { value: PrinterType; label: string }[] = [
  { value: 'FDM_open', label: 'FDM ระบบเปิด' },
  { value: 'FDM_closed', label: 'FDM ระบบปิด' },
  { value: 'Resin', label: 'เลซิน (Resin)' },
];

interface UploadedFile {
  file: File;
  url?: string;
  originalName: string;
  uploading: boolean;
  error?: string;
}

export default function ReservePage() {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: filaments = [] } = useQuery({
    queryKey: ['filaments'],
    queryFn: async () => (await api.get<Filament[]>('/filaments')).data,
  });

  const filamentTypes = useMemo(
    () => Array.from(new Set(filaments.filter((f) => !f.isDiscontinued).map((f) => f.type))),
    [filaments]
  );

  const [printerType, setPrinterType] = useState<PrinterType | ''>('');
  const [jobName, setJobName] = useState('');
  const [filamentType, setFilamentType] = useState('');
  const [infillPercent, setInfillPercent] = useState(20);
  const [infillInput, setInfillInput] = useState('20');
  const [scheduledStart, setScheduledStart] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (!scheduledStart) setScheduledStart(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const allowed = ['.stl', '.obj', '.3mf', '.amf'];
    Array.from(files).forEach((file) => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowed.includes(ext)) {
        toast({ title: `ไฟล์ ${file.name} ไม่รองรับ`, description: `รองรับ: ${allowed.join(', ')}`, variant: 'destructive' });
        return;
      }
      setUploadedFiles((prev) => [...prev, { file, originalName: file.name, uploading: false }]);
      if (!previewFile) setPreviewFile(file);
    });
  };

  const removeFile = (idx: number) => {
    setUploadedFiles((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (previewFile === prev[idx].file) setPreviewFile(next[0]?.file ?? null);
      return next;
    });
  };

  async function uploadFile(uf: UploadedFile): Promise<{ url: string; originalName: string }> {
    const formData = new FormData();
    formData.append('model', uf.file);
    const { data } = await api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { url: data.url, originalName: data.originalName };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!printerType) {
      toast({ title: 'กรุณาเลือกประเภทเครื่องพิมพ์', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      // Upload all files
      const files: { url: string; originalName: string }[] = [];
      for (const uf of uploadedFiles) {
        setUploadedFiles((prev) => prev.map((f) => f === uf ? { ...f, uploading: true } : f));
        const result = await uploadFile(uf);
        files.push(result);
        setUploadedFiles((prev) => prev.map((f) => f === uf ? { ...f, uploading: false, url: result.url } : f));
      }

      await api.post('/reservations', {
        printerType,
        jobName,
        filamentType: filamentType || undefined,
        infillPercent,
        scheduledStart: new Date(scheduledStart).toISOString(),
        files,
        notes: notes || undefined,
      });

      toast({ title: 'ส่งงานสำเร็จ', description: 'รอ admin ตรวจสอบและ slice ไฟล์', variant: 'success' });
      router.push('/history');
    } catch (err: any) {
      toast({ title: 'ส่งงานไม่สำเร็จ', description: err.response?.data?.message || 'ลองใหม่อีกครั้ง', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-10">
        <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">§ Reserve</span>
        <h1 className="mt-2 font-display text-5xl tracking-tight">Book a session.</h1>
        <p className="mt-2 text-muted-foreground">อัปโหลดโมเดล เลือกประเภทเครื่อง แล้วรอ admin ส่ง slice กลับมายืนยัน</p>
      </div>

      <Card className="p-8">
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Job name */}
          <div className="space-y-2">
            <Label htmlFor="jobName">ชื่องาน / โปรเจกต์</Label>
            <Input id="jobName" value={jobName} onChange={(e) => setJobName(e.target.value)} placeholder="Robot chassis v2" required />
          </div>

          {/* Printer type */}
          <div className="space-y-2">
            <Label>ประเภทเครื่องพิมพ์</Label>
            <Select value={printerType} onValueChange={(v) => setPrinterType(v as PrinterType)}>
              <SelectTrigger><SelectValue placeholder="เลือกประเภท" /></SelectTrigger>
              <SelectContent>
                {PRINTER_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>วันที่ต้องการ</Label>
            <Input type="date" value={scheduledStart} onChange={(e) => setScheduledStart(e.target.value)} required />
          </div>

          {/* Filament type */}
          <div className="space-y-2">
            <Label>ชนิดเส้นพลาสติก (เลือกได้)</Label>
            <Select value={filamentType} onValueChange={setFilamentType}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {filamentTypes.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Infill */}
          <div className="space-y-2">
            <Label>Infill %</Label>
            <div className="flex flex-wrap gap-2 items-center">
              {[10, 15, 20, 25, 30, 50, 75, 100].map((v) => (
                <button
                  key={v} type="button"
                  onClick={() => { setInfillPercent(v); setInfillInput(String(v)); }}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold border transition-all ${
                    infillPercent === v
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-muted-foreground border-border hover:border-purple-400 hover:text-purple-600'
                  }`}
                >
                  {v}%
                </button>
              ))}
              <div className="flex items-center gap-1.5 ml-1">
                <Input
                  type="number" min={1} max={100} value={infillInput}
                  onChange={(e) => {
                    setInfillInput(e.target.value);
                    const n = parseInt(e.target.value);
                    if (!isNaN(n) && n >= 1 && n <= 100) setInfillPercent(n);
                  }}
                  className="w-20 h-8 text-sm font-mono"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">ทั่วไปใช้ 15-20%</p>
          </div>

          {/* Multi-file upload */}
          <div className="space-y-3">
            <Label>ไฟล์โมเดล 3D</Label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFileSelect(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all ${
                isDragOver ? 'border-purple-400 bg-purple-50' : 'border-border hover:border-purple-300 hover:bg-purple-50/30'
              }`}
            >
              <div className="rounded-full bg-purple-100 p-3">
                <Upload className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">ลากหรือคลิกเลือกไฟล์ (หลายไฟล์ได้)</p>
                <p className="text-xs text-muted-foreground mt-1">.STL · .OBJ · .3MF · .AMF · สูงสุด 100 MB/ไฟล์</p>
              </div>
              <input ref={fileInputRef} type="file" accept=".stl,.obj,.3mf,.amf" multiple className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)} />
            </div>

            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                {uploadedFiles.map((uf, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-purple-200 bg-purple-50/50 px-4 py-2.5">
                    <FileBox className="h-4 w-4 text-purple-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{uf.originalName}</p>
                      <p className="text-xs text-muted-foreground">
                        {(uf.file.size / 1024 / 1024).toFixed(2)} MB
                        {uf.uploading && ' · กำลังอัปโหลด…'}
                        {uf.url && ' · อัปโหลดแล้ว'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {/* Preview first/selected file */}
                {previewFile && (
                  <div className="space-y-1">
                    <div className="flex gap-2 flex-wrap">
                      {uploadedFiles.map((uf, i) => (
                        <button key={i} type="button"
                          onClick={() => setPreviewFile(uf.file)}
                          className={`font-mono text-[10px] px-2 py-1 rounded border transition-all ${
                            previewFile === uf.file
                              ? 'border-purple-500 text-purple-700 bg-purple-50'
                              : 'border-border text-muted-foreground hover:border-purple-300'
                          }`}
                        >
                          {uf.originalName}
                        </button>
                      ))}
                    </div>
                    <ModelViewer file={previewFile} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>หมายเหตุ (เพิ่มเติม)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ข้อมูลเพิ่มเติมสำหรับ admin…" />
          </div>

          {/* Summary */}
          <div className="rounded-lg border border-dashed border-border p-4 bg-secondary/30 space-y-1.5 font-mono text-xs">
            <Row label="วันที่" value={scheduledStart ? format(new Date(scheduledStart), 'd MMM yyyy') : '—'} />
            <Row label="ประเภทเครื่อง" value={PRINTER_TYPES.find((t) => t.value === printerType)?.label ?? '—'} />
            {filamentType && <Row label="Filament" value={filamentType} />}
            <Row label="Infill" value={`${infillPercent}%`} />
            <Row label="ไฟล์" value={uploadedFiles.length ? `${uploadedFiles.length} ไฟล์` : '—'} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" size="lg" disabled={submitting || !printerType || !jobName}>
              {submitting ? 'กำลังส่ง…' : 'ส่งให้ Admin'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.back()}>ยกเลิก</Button>
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
