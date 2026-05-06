'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, Reservation } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { formatHours } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function AdminReservationsPage() {
  const [status, setStatus] = useState<string>('all');
  const router = useRouter();

  const { data: reservations = [] } = useQuery({
    queryKey: ['admin', 'reservations', status],
    queryFn: async () =>
      (
        await api.get<Reservation[]>('/reservations', {
          params: status === 'all' ? {} : { status },
        })
      ).data,
  });

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between border-b border-border pb-6 gap-4">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            § Logs
          </span>
          <h1 className="mt-2 font-display text-5xl tracking-tight">Reservations.</h1>
        </div>
        <div className="w-48">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="pending_review">รอตรวจสอบ</SelectItem>
              <SelectItem value="pending_confirmation">รอยืนยัน</SelectItem>
              <SelectItem value="confirmed">ยืนยันแล้ว</SelectItem>
              <SelectItem value="in_progress">กำลังปริ้น</SelectItem>
              <SelectItem value="completed">เสร็จแล้ว</SelectItem>
              <SelectItem value="cancelled">ยกเลิก</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50">
              <tr className="text-left">
                <Th>Date</Th>
                <Th>User</Th>
                <Th>Job</Th>
                <Th>Printer</Th>
                <Th>Hours</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr
                  key={r._id}
                  className="border-b border-border last:border-0 hover:bg-secondary/30 cursor-pointer"
                  onClick={() => router.push(`/admin/reservations/${r._id}`)}
                >
                  <Td>
                    <div className="font-mono text-xs">
                      {format(new Date(r.scheduledStart), 'd MMM')}
                      <br />
                      <span className="text-muted-foreground">
                        {format(new Date(r.scheduledStart), 'HH:mm')}
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <div className="font-medium">
                      {r.user.firstName} {r.user.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {r.user.studentId}
                    </div>
                  </Td>
                  <Td>{r.jobName}</Td>
                  <Td>
                    <span className="font-mono text-xs">{r.printer?.name ?? r.printerType}</span>
                  </Td>
                  <Td>
                    <span className="font-mono numeric">
                      {r.hoursConsumed != null && r.hoursConsumed > 0
                        ? formatHours(r.hoursConsumed)
                        : r.estimatedHours != null
                          ? `~${formatHours(r.estimatedHours)}`
                          : '—'}
                    </span>
                  </Td>
                  <Td>
                    <Badge
                      variant={
                        r.status === 'completed' ? 'success'
                          : r.status === 'in_progress' ? 'danger'
                            : r.status === 'cancelled' ? 'outline'
                              : r.status === 'pending_confirmation' ? 'default'
                                : 'secondary'
                      }
                    >
                      {r.status.replace(/_/g, ' ')}
                    </Badge>
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
