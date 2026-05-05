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
import { Plus } from 'lucide-react';

export default function AdminPrintersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [modelName, setModelName] = useState('');
  const [type, setType] = useState<'FDM' | 'Resin'>('FDM');

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
      toast({ title: 'Printer added', variant: 'success' });
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/printers/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['printers'] }),
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
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bambu Lab P1S #4" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input id="model" value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="P1S" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as 'FDM' | 'Resin')}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FDM">FDM</SelectItem>
                  <SelectItem value="Resin">Resin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => create.mutate()} disabled={!name || !modelName}>
              Create
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {printers.map((p) => (
          <Card key={p._id} className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {p.type} · {p.modelName}
                </div>
                <div className="font-display text-xl mt-1">{p.name}</div>
              </div>
              <span
                className={
                  p.status === 'available'
                    ? 'dot dot-available'
                    : p.status === 'in_use'
                      ? 'dot dot-busy'
                      : 'dot dot-maintenance'
                }
              />
            </div>

            <div className="flex items-center justify-between text-xs font-mono">
              <Badge variant="outline">{p.status.replace('_', ' ')}</Badge>
              <span className="text-muted-foreground">
                {p.totalHoursUsed.toFixed(1)}h logged
              </span>
            </div>

            <div className="pt-3 border-t border-border space-y-2">
              <Label>Set status</Label>
              <Select
                value={p.status}
                onValueChange={(status) => updateStatus.mutate({ id: p._id, status })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="in_use">In use</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
