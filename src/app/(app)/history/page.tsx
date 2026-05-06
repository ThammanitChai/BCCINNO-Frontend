'use client';

import { useQuery } from '@tanstack/react-query';
import { api, Reservation } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format } from 'date-fns';

const STATUS_LABEL: Record<string, string> = {
  pending_review: 'รอตรวจสอบ',
  pending_confirmation: 'รอยืนยัน',
  confirmed: 'ยืนยันแล้ว',
  in_progress: 'กำลังปริ้น',
  completed: 'เสร็จแล้ว',
  cancelled: 'ยกเลิก',
};

const TYPE_LABEL: Record<string, string> = {
  FDM_open: 'FDM เปิด',
  FDM_closed: 'FDM ปิด',
  Resin: 'Resin',
};

export default function HistoryPage() {
  const { data: reservations = [] } = useQuery({
    queryKey: ['reservations', 'mine'],
    queryFn: async () => (await api.get<Reservation[]>('/reservations')).data,
  });

  return (
    <div className="space-y-8">
      <div className="border-b border-border pb-6">
        <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">§ History</span>
        <h1 className="mt-2 font-display text-5xl tracking-tight">Sessions.</h1>
      </div>

      {reservations.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">ยังไม่มีการจอง</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50">
                <tr className="text-left">
                  <Th>วันที่</Th>
                  <Th>ชื่องาน</Th>
                  <Th>เครื่อง</Th>
                  <Th>เวลา</Th>
                  <Th>สถานะ</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => (
                  <tr key={r._id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                    <Td>
                      <div className="font-mono text-xs">
                        {format(new Date(r.scheduledStart), 'd MMM yyyy')}
                      </div>
                    </Td>
                    <Td>
                      <div className="font-medium">{r.jobName}</div>
                      {r.filamentType && (
                        <div className="text-xs text-muted-foreground mt-0.5">{r.filamentType}</div>
                      )}
                    </Td>
                    <Td>
                      <span className="font-mono text-xs">
                        {r.printer?.name ?? TYPE_LABEL[r.printerType] ?? r.printerType}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono text-xs">
                        {r.hoursConsumed != null && r.hoursConsumed > 0
                          ? `${r.hoursConsumed} ชม.`
                          : r.estimatedHours != null
                            ? `~${r.estimatedHours} ชม.`
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
                        {STATUS_LABEL[r.status] ?? r.status}
                      </Badge>
                      {r.status === 'pending_confirmation' && (
                        <p className="text-xs text-purple-600 mt-1">กรุณายืนยัน →</p>
                      )}
                    </Td>
                    <Td>
                      <Link
                        href={`/reserve/${r._id}`}
                        className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
                      >
                        เปิด →
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{children}</th>;
}
function Td({ children }: { children?: React.ReactNode }) {
  return <td className="px-4 py-3 align-top">{children}</td>;
}
