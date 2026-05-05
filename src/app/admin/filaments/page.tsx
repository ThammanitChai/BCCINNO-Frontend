'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Filament } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toaster';
import { Plus, AlertTriangle } from 'lucide-react';

export default function AdminFilamentsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: '',
    brand: '',
    color: '',
    currentAmount: '',
    minimumStock: '2',
    pricePerGram: '2',
  });

  const { data: filaments = [] } = useQuery({
    queryKey: ['filaments'],
    queryFn: async () => (await api.get<Filament[]>('/filaments')).data,
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Filament> }) =>
      api.patch(`/filaments/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['filaments'] }),
  });

  const create = useMutation({
    mutationFn: () =>
      api.post('/filaments', {
        type: form.type,
        brand: form.brand,
        color: form.color,
        currentAmount: parseFloat(form.currentAmount) || 0,
        minimumStock: parseFloat(form.minimumStock) || 0,
        pricePerGram: parseFloat(form.pricePerGram) || 0,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['filaments'] });
      setShowForm(false);
      setForm({ type: '', brand: '', color: '', currentAmount: '', minimumStock: '2', pricePerGram: '2' });
      toast({ title: 'Filament added', variant: 'success' });
    },
  });

  const lowStock = filaments.filter(
    (f) => !f.isDiscontinued && f.currentAmount <= f.minimumStock
  );

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            § Inventory
          </span>
          <h1 className="mt-2 font-display text-5xl tracking-tight">Materials.</h1>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {lowStock.length > 0 && (
        <Card className="p-4 border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <span className="text-sm">
            <strong>{lowStock.length}</strong> filament(s) at or below minimum stock
          </span>
        </Card>
      )}

      {showForm && (
        <Card className="p-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="PLA" />
            </div>
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Polymaker" />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="White" />
            </div>
            <div className="space-y-2">
              <Label>Current amount</Label>
              <Input type="number" value={form.currentAmount} onChange={(e) => setForm({ ...form, currentAmount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Minimum stock</Label>
              <Input type="number" value={form.minimumStock} onChange={(e) => setForm({ ...form, minimumStock: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Price/g (THB)</Label>
              <Input type="number" step="0.1" value={form.pricePerGram} onChange={(e) => setForm({ ...form, pricePerGram: e.target.value })} />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => create.mutate()} disabled={!form.type || !form.brand || !form.color}>
              Create
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50">
              <tr className="text-left">
                <Th>Type</Th>
                <Th>Brand</Th>
                <Th>Color</Th>
                <Th>Stock</Th>
                <Th>Min</Th>
                <Th>Price/g</Th>
                <Th>Status</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {filaments.map((f) => {
                const low = !f.isDiscontinued && f.currentAmount <= f.minimumStock;
                return (
                  <tr key={f._id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                    <Td>{f.type}</Td>
                    <Td>
                      <span className="text-xs">{f.brand}{f.subBrand ? ` · ${f.subBrand}` : ''}</span>
                    </Td>
                    <Td>{f.color}</Td>
                    <Td>
                      <Input
                        type="number"
                        defaultValue={f.currentAmount}
                        className="w-20 h-8"
                        onBlur={(e) => {
                          const v = parseFloat(e.target.value);
                          if (!isNaN(v) && v !== f.currentAmount) {
                            update.mutate({ id: f._id, body: { currentAmount: v } });
                          }
                        }}
                      />
                    </Td>
                    <Td><span className="font-mono numeric text-xs">{f.minimumStock}</span></Td>
                    <Td><span className="font-mono numeric text-xs">฿{f.pricePerGram}</span></Td>
                    <Td>
                      {f.isDiscontinued ? (
                        <Badge variant="outline">Discontinued</Badge>
                      ) : low ? (
                        <Badge variant="warning">Low</Badge>
                      ) : (
                        <Badge variant="success">OK</Badge>
                      )}
                    </Td>
                    <Td>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          update.mutate({ id: f._id, body: { isDiscontinued: !f.isDiscontinued } })
                        }
                      >
                        {f.isDiscontinued ? 'Restore' : 'Discontinue'}
                      </Button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
      {children}
    </th>
  );
}
function Td({ children }: { children?: React.ReactNode }) {
  return <td className="px-4 py-3 align-middle">{children}</td>;
}
