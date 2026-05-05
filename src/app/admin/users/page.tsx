'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, User } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toaster';
import { trackLabel, formatHours } from '@/lib/utils';
import { Search } from 'lucide-react';

export default function AdminUsersPage() {
  const [q, setQ] = useState('');
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['admin', 'users', q],
    queryFn: async () =>
      (await api.get<User[]>('/users', { params: q ? { q } : {} })).data,
  });

  const grant = useMutation({
    mutationFn: ({ id, hours }: { id: string; hours: number }) =>
      api.post(`/users/${id}/grant-hours`, { hours }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({ title: 'Hours updated', variant: 'success' });
    },
  });

  const reset = useMutation({
    mutationFn: (id: string) => api.post(`/users/${id}/reset-term`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({ title: 'Term reset', variant: 'success' });
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/users/${id}`, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            § Members
          </span>
          <h1 className="mt-2 font-display text-5xl tracking-tight">All members.</h1>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, ID, email"
            className="pl-9"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50">
              <tr className="text-left">
                <Th>Name</Th>
                <Th>ID</Th>
                <Th>Track</Th>
                <Th>Quota / Used</Th>
                <Th>Status</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u._id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                  <Td>
                    <div className="font-medium">{u.firstName} {u.lastName}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs">{u.studentId}</span>
                  </Td>
                  <Td>
                    <Badge variant="outline">{trackLabel(u.track)}</Badge>
                  </Td>
                  <Td>
                    <span className="font-mono numeric">
                      {formatHours(u.hoursUsed)} / {formatHours(u.hoursQuota)}
                    </span>
                  </Td>
                  <Td>
                    <Badge variant={u.role === 'admin' ? 'accent' : u.isActive ? 'success' : 'outline'}>
                      {u.role === 'admin' ? 'Admin' : u.isActive ? 'Active' : 'Disabled'}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex gap-1.5 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const v = prompt('Hours to add (use negative to reduce):');
                          if (v) grant.mutate({ id: u._id, hours: parseFloat(v) });
                        }}
                      >
                        + hours
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Reset this term for this user?')) reset.mutate(u._id);
                        }}
                      >
                        Reset
                      </Button>
                      {u.role !== 'admin' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive.mutate({ id: u._id, isActive: !u.isActive })}
                        >
                          {u.isActive ? 'Disable' : 'Enable'}
                        </Button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
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
