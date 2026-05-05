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
import { formatHours } from '@/lib/utils';
import { format } from 'date-fns';
import { Upload, X, FileBox, Zap } from 'lucide-react';
import type { ModelStats } from '@/components/model-viewer';

const ModelViewer = dynamic(() => import('@/components/model-viewer'), { ssr: false, loading: () => null });

// Material densities (g/cm³) — matched to our filament types
const DENSITY: Record<string, number> = {
  'PLA': 1.24, 'PLA Pro': 1.24, 'PLA Support': 1.24,
  'PLA Mussel': 1.24, 'PLA Trigo': 1.24,
  'ABS': 1.04, 'PC-ABS': 1.19,
  'TPU95-HF': 1.21, 'PC': 1.20,
  'PETG': 1.27, 'PETG-ESD': 1.27,
  'PVA': 1.23,
};

// Bambu Studio P1P/P1S approximation
// Layer 0.2mm, nozzle 0.4mm, 2 walls, 4 top/bottom layers
function estimatePrint(stats: ModelStats, infill: number, material: string) {
  const density = DENSITY[material] ?? 1.24;
  const wallThick = 2 * 0.4;  // 2 walls × 0.4mm nozzle = 0.8mm

  // Shell = all faces × wall thickness (top/bottom already included via surface area)
  const shellVol = Math.min(stats.surfaceAreaMm2 * wallThick, stats.volumeMm3);
  const innerVol = Math.max(0, stats.volumeMm3 - shellVol);
  const infillVol = innerVol * (infill / 100);
  const extrudedVol = shellVol + infillVol;  // mm³

  const weightG = (extrudedVol / 1000) * density;  // g

  // Effective volumetric extrusion rate (accounting for accel, travel, decel)
  // Shell walls: ~7 mm³/s   Infill: ~12 mm³/s   Travel overhead: ×1.25
  // Startup (heatup + leveling + purge): ~3 min
  const shellSec = (shellVol / 7) * 1.25;
  const infillSec = (infillVol / 12) * 1.25;
  const startupSec = 180;
  const totalSec = shellSec + infillSec + startupSec;
  const hours = totalSec / 3600;

  return {
    weightG: Math.max(0.1, weightG),
    hours: Math.max(0.1, hours),
  };
}

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
  const [filamentColor, setFilamentColor] = useState('');
  const [filamentWeight, setFilamentWeight] = useState('');
  const [scheduledStart, setScheduledStart] = useState('');
  const [scheduledHours, setScheduledHours] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  const [modelFile, setModelFile] = useState<File | null>(null);
  const [modelStats, setModelStats] = useState<ModelStats | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [infillPercent, setInfillPercent] = useState<number>(20);
  const [infillInput, setInfillInput] = useState('20');

  // Set today's date only on the client to avoid SSR/hydration mismatch
  useEffect(() => {
    if (!scheduledStart) setScheduledStart(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const estimate = useMemo(() => {
    if (!modelStats) return null;
    return estimatePrint(modelStats, infillPercent, filamentType);
  }, [modelStats, infillPercent, filamentType]);

  const colorsForType = useMemo(
    () =>
      filaments
        .filter((f) => f.type === filamentType && !f.isDiscontinued)
        .map((f) => f.color),
    [filamentType, filaments]
  );

  const handleFileSelect = (file: File) => {
    const allowed = ['.stl', '.obj', '.3mf', '.amf'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      toast({ title: 'ไฟล์ไม่รองรับ', description: `รองรับ: ${allowed.join(', ')}`, variant: 'destructive' });
      return;
    }
    setModelFile(file);
    setModelStats(null);
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

    const hours = parseFloat(scheduledHours);
    if (hours > user.hoursRemaining) {
      toast({
        title: 'ชั่วโมงไม่พอ',
        description: `คงเหลือ ${formatHours(user.hoursRemaining)}`,
        variant: 'destructive',
      });
      return;
    }

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
        filamentColor: filamentColor || undefined,
        filamentWeight: filamentWeight ? parseFloat(filamentWeight) : undefined,
        scheduledStart: new Date(scheduledStart).toISOString(),
        scheduledHours: hours,
        fileUrl,
        modelFileName,
        infillPercent,
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

          {/* Filament */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Filament type</Label>
              <Select value={filamentType} onValueChange={(v) => { setFilamentType(v); setFilamentColor(''); }}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {filamentTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Color</Label>
                <Select value={filamentColor} onValueChange={setFilamentColor} disabled={!filamentType}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {colorsForType.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>น้ำหนัก (g)</Label>
                <Input
                  type="number" min="0" step="0.1"
                  value={filamentWeight}
                  onChange={(e) => setFilamentWeight(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Infill */}
          <div className="space-y-2">
            <Label>Infill %</Label>
            <div className="flex flex-wrap gap-2 items-center">
              {[10, 15, 20, 25, 30, 50, 75, 100].map((v) => (
                <button
                  key={v}
                  type="button"
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
                  type="number"
                  min={1}
                  max={100}
                  value={infillInput}
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
            <p className="text-xs text-muted-foreground">ความหนาแน่นของโครงสร้างภายใน — ทั่วไปใช้ 15-20%</p>
          </div>

          {/* Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>วันที่จอง</Label>
              <Input
                type="date"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>ชั่วโมงโดยประมาณ</Label>
              <Input
                type="number" min="0.5" max="48" step="0.5"
                value={scheduledHours}
                onChange={(e) => setScheduledHours(e.target.value)}
                required
              />
            </div>
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

                {/* 3D Preview */}
                <ModelViewer file={modelFile} onLoad={setModelStats} />

                {/* Print estimate */}
                {estimate && (
                  <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="h-3.5 w-3.5 text-purple-500" />
                      <span className="font-mono text-[10px] uppercase tracking-widest text-purple-700">
                        Print estimate · Bambu P1S · 0.2 mm
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <EstBox
                        label="น้ำหนัก"
                        value={`~${estimate.weightG.toFixed(1)} g`}
                        sub="±15%"
                        onApply={() => setFilamentWeight(estimate.weightG.toFixed(1))}
                      />
                      <EstBox
                        label="เวลาปริ้น"
                        value={`~${fmtTime(estimate.hours)}`}
                        sub="±20%"
                        onApply={() => setScheduledHours(Math.max(0.5, parseFloat(estimate.hours.toFixed(2))).toString())}
                      />
                    </div>
                    <p className="font-mono text-[9px] text-muted-foreground/50 mt-2">
                      คำนวณจาก volume {(modelStats!.volumeMm3 / 1000).toFixed(1)} cm³ · infill {infillPercent}%
                      {filamentType ? ` · ${filamentType}` : ''}
                    </p>
                  </div>
                )}
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
            <Row label="ระยะเวลา" value={formatHours(parseFloat(scheduledHours) || 0)} />
            <Row label="Infill" value={`${infillPercent}%`} />
            <Row label="ชั่วโมงคงเหลือหลังจอง" value={
              user
                ? formatHours(Math.max(0, user.hoursRemaining - (parseFloat(scheduledHours) || 0)))
                : '—'
            } />
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

function fmtTime(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m} นาที`;
  if (m === 0) return `${h} ชม.`;
  return `${h} ชม. ${m} นาที`;
}

function EstBox({
  label, value, sub, onApply,
}: {
  label: string; value: string; sub: string; onApply: () => void;
}) {
  return (
    <div className="rounded-lg bg-white border border-purple-100 p-3 space-y-1">
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-mono text-lg font-bold text-purple-700">{value}</div>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] text-muted-foreground/60">{sub}</span>
        <button
          type="button"
          onClick={onApply}
          className="font-mono text-[9px] uppercase tracking-wider text-purple-600 hover:text-purple-800 transition-colors"
        >
          ใช้ค่านี้ →
        </button>
      </div>
    </div>
  );
}
