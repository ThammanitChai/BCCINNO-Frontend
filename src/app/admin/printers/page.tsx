'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Printer } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toaster';
import { Plus, Trash2, Wifi, ChevronDown, ChevronUp } from 'lucide-react';

export default function AdminPrintersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [modelName, setModelName] = useState('');
  const [type, setType] = useState<'FDM' | 'Resin'>('FDM');
  const [expandedBambu, setExpandedBambu] = useState<string | null>(null);

  const { data: printers = [] } = useQuery({
    queryKey: ['printers'],
    queryFn: async () => (await api.get<Printer[]>('/printers')).data,
  });

  const create = useMutation({
    mutationFn: () => api.post('/printers', { name, modelName, type }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['printers'] });
      setShowForm(false);
      setName('');
      setModelName('');
      toast({ title: 'เพิ่มเครื่องพิมพ์แล้ว', variant: 'success' });
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/printers/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['printers'] }),
  });

  const updateBambu = useMutation({
    mutationFn: ({ id, bambuIp, bambuSerial, bambuAccessCode }: {
      id: string; bambuIp: string; bambuSerial: string; bambuAccessCode: string;
    }) => api.patch(`/printers/${id}`, { bambuIp, bambuSerial, bambuAccessCode }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['printers'] });
      toast({ title: 'บันทึก Bambu config แล้ว', variant: 'success' });
    },
  });

  const testPrint = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      api.post(`/printers/${id}/print`, { jobName: 'Test from IEMS' }),
    onSuccess: () => toast({ title: 'ส่งคำสั่งสำเร็จ', variant: 'success' }),
    onError: (err: any) =>
      toast({ title: 'ส่งคำสั่งไม่ได้', description: err.response?.data?.message, variant: 'destructive' }),
  });

  const deletePrinter = useMutation({
    mutationFn: (id: string) => api.delete(`/printers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['printers'] });
      toast({ title: 'ลบเครื่องพิมพ์แล้ว', variant: 'success' });
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            § Fleet management
          </span>
          <h1 className="mt-2 font-display text-5xl tracking-tight">Printers.</h1>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> Add printer
        </Button>
      </div>

      {showForm && (
        <Card className="p-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="BCCInno_P1S_04" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input id="model" value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="P1S" />
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as 'FDM' | 'Resin')}>
              <SelectTrigger id="type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="FDM">FDM</SelectItem>
                <SelectItem value="Resin">Resin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => create.mutate()} disabled={!name || !modelName}>Create</Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {printers.map((p) => (
          <PrinterCard
            key={p._id}
            p={p}
            expandedBambu={expandedBambu}
            setExpandedBambu={setExpandedBambu}
            onUpdateStatus={(status) => updateStatus.mutate({ id: p._id, status })}
            onUpdateBambu={(vals) => updateBambu.mutate({ id: p._id, ...vals })}
            onTestPrint={() => testPrint.mutate({ id: p._id })}
            onDelete={() => { if (confirm(`ลบ "${p.name}"?`)) deletePrinter.mutate(p._id); }}
            testPending={testPrint.isPending}
          />
        ))}
      </div>
    </div>
  );
}

function PrinterCard({
  p, expandedBambu, setExpandedBambu,
  onUpdateStatus, onUpdateBambu, onTestPrint, onDelete, testPending,
}: {
  p: Printer;
  expandedBambu: string | null;
  setExpandedBambu: (id: string | null) => void;
  onUpdateStatus: (s: string) => void;
  onUpdateBambu: (v: { bambuIp: string; bambuSerial: string; bambuAccessCode: string }) => void;
  onTestPrint: () => void;
  onDelete: () => void;
  testPending: boolean;
}) {
  const [bambuIp, setBambuIp] = useState(p.bambuIp || '');
  const [bambuSerial, setBambuSerial] = useState(p.bambuSerial || '');
  const [bambuAccessCode, setBambuAccessCode] = useState(p.bambuAccessCode || '');
  const showBambu = expandedBambu === p._id;
  const hasBambu = !!(p.bambuIp && p.bambuSerial && p.bambuAccessCode);

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {p.type} · {p.modelName}
          </div>
          <div className="font-display text-xl mt-1">{p.name}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className={
            p.status === 'available' ? 'dot dot-available'
              : p.status === 'in_use' ? 'dot dot-busy'
              : 'dot dot-maintenance'
          } />
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs font-mono">
        <Badge variant="outline">{p.status.replace('_', ' ')}</Badge>
        <span className="text-muted-foreground">{p.totalHoursUsed.toFixed(1)}h logged</span>
      </div>

      {/* Bambu Lab config section */}
      <div className="border-t border-border pt-3">
        <button
          type="button"
          onClick={() => setExpandedBambu(showBambu ? null : p._id)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <Wifi className={`h-3.5 w-3.5 ${hasBambu ? 'text-purple-500' : 'text-muted-foreground'}`} />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Bambu Lab {hasBambu ? '· configured' : '· not set'}
            </span>
          </div>
          {showBambu ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>

        {showBambu && (
          <div className="mt-3 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">IP Address</Label>
              <Input
                value={bambuIp}
                onChange={(e) => setBambuIp(e.target.value)}
                placeholder="192.168.1.xxx"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Serial Number</Label>
              <Input
                value={bambuSerial}
                onChange={(e) => setBambuSerial(e.target.value)}
                placeholder="01P00Cxxxxxxxxxx"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Access Code</Label>
              <Input
                value={bambuAccessCode}
                onChange={(e) => setBambuAccessCode(e.target.value)}
                placeholder="12345678"
                type="password"
                className="h-8 text-sm"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => onUpdateBambu({ bambuIp, bambuSerial, bambuAccessCode })}
              >
                Save
              </Button>
              {hasBambu && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onTestPrint}
                  disabled={testPending}
                >
                  Test ping
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Set Status — last so dropdown opens below the card */}
      <div className="pt-2 border-t border-border space-y-2">
        <Label>Set status</Label>
        <Select value={p.status} onValueChange={onUpdateStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="in_use">In use</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
}
