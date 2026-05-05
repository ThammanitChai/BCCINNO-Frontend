'use client';

import { useQuery } from '@tanstack/react-query';
import { api, Printer } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function PrintersPage() {
  const { data: printers = [] } = useQuery({
    queryKey: ['printers'],
    queryFn: async () => (await api.get<Printer[]>('/printers')).data,
  });

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            § Fleet
          </span>
          <h1 className="mt-2 font-display text-5xl tracking-tight">Printers.</h1>
        </div>
        <Button asChild>
          <Link href="/reserve">Reserve</Link>
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {printers.map((p) => (
          <PrinterCard key={p._id} printer={p} />
        ))}
      </div>
    </div>
  );
}

function PrinterCard({ printer }: { printer: Printer }) {
  const variant =
    printer.status === 'available'
      ? 'success'
      : printer.status === 'in_use'
        ? 'danger'
        : 'warning';
  const dotClass =
    printer.status === 'available'
      ? 'dot-available'
      : printer.status === 'in_use'
        ? 'dot-busy'
        : 'dot-maintenance';

  return (
    <Card className="p-6 flex flex-col gap-4 hover:border-foreground/40 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {printer.type} · {printer.modelName}
          </div>
          <div className="font-display text-xl mt-1">{printer.name}</div>
        </div>
        <span className={`dot ${dotClass}`} />
      </div>

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/60">
        <Badge variant={variant}>{printer.status.replace('_', ' ')}</Badge>
        <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {printer.totalHoursUsed.toFixed(1)}h logged
        </div>
      </div>

      {printer.currentUser && (
        <div className="font-mono text-[11px] text-muted-foreground -mt-1">
          In use by {printer.currentUser.firstName} {printer.currentUser.lastName}
        </div>
      )}
    </Card>
  );
}
