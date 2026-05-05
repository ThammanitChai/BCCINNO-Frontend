'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/store';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toaster';
import { trackLabel } from '@/lib/utils';
import { Phone } from 'lucide-react';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/users/me', { phone });
      await refreshUser();
      toast({ title: 'บันทึกแล้ว', variant: 'success' });
    } catch (err: any) {
      toast({
        title: 'บันทึกไม่สำเร็จ',
        description: err.response?.data?.message || 'ลองใหม่อีกครั้ง',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg space-y-10">
      <div className="border-b border-border pb-6">
        <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          § Account
        </span>
        <h1 className="mt-2 font-display text-5xl tracking-tight">Profile.</h1>
      </div>

      {/* Info */}
      <Card className="p-6 space-y-4">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          ข้อมูลบัญชี
        </span>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <Row label="ชื่อ" value={`${user.firstName} ${user.lastName}`} />
          <Row label="Email" value={user.email} />
          <Row label="รหัส" value={user.studentId} />
          <Row label="แทรค" value={trackLabel(user.track)} />
          <Row label="Role" value={user.role === 'admin' ? 'Administrator' : 'Student'} />
          <Row label="Quota" value={`${user.hoursQuota}h`} />
        </div>
      </Card>

      {/* Phone edit */}
      <Card className="p-6">
        <form onSubmit={onSave} className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="h-4 w-4 text-purple-500" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              เบอร์โทรศัพท์
            </span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">เบอร์โทร</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08X-XXX-XXXX"
              maxLength={20}
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? 'กำลังบันทึก…' : 'บันทึก'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
        {label}
      </dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}
