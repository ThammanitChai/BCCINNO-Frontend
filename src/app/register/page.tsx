'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, RegisterPayload } from '@/lib/store';
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
import { ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const register = useAuth((s) => s.register);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<RegisterPayload>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    studentId: '',
    nationalIdLast4: '',
    phone: '',
    track: 'training',
  });

  function update<K extends keyof RegisterPayload>(key: K, value: RegisterPayload[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await register(form);
      toast({ title: 'Registered', description: 'Welcome to IEMS Lab', variant: 'success' });
      router.push('/dashboard');
    } catch (err: any) {
      toast({
        title: 'Registration failed',
        description: err.response?.data?.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      <aside className="hidden lg:flex relative bg-primary text-primary-foreground p-12 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 grain opacity-30" />

        <div className="relative flex items-center justify-between">
          <Link
            href="/"
            className="font-mono text-[11px] uppercase tracking-[0.25em] flex items-center gap-2 hover:text-accent transition-colors w-fit"
          >
            <ArrowLeft className="h-3 w-3" />
            Return home
          </Link>
          <img src="/bcclogo.png" alt="BCC Logo" className="h-10 w-auto object-contain opacity-90" />
        </div>

        <div className="relative space-y-4 max-w-md">
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] opacity-60">
            § Onboarding
          </span>
          <h1 className="font-display text-6xl tracking-tight leading-[0.95]">
            Join the <br />
            <span className="italic font-light text-accent">studio.</span>
          </h1>
          <p className="text-primary-foreground/70 leading-relaxed">
            Quotas are auto-assigned by track. Inno/Smart 10h · BME 12h · Engineer 8h · Training 6h.
          </p>
        </div>

        <div className="relative font-mono text-[10px] uppercase tracking-widest opacity-40">
          BCC · IEMS · Lab Studio · 2026
        </div>
      </aside>

      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden">
            <Link
              href="/"
              className="font-mono text-[11px] uppercase tracking-[0.25em] flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors w-fit mb-8"
            >
              <ArrowLeft className="h-3 w-3" />
              Return home
            </Link>
          </div>

          <div>
            <h2 className="font-display text-3xl tracking-tight">Create account</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Use your BCC email. Quota will be set automatically.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name <span className="text-muted-foreground font-normal">(English only)</span></Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => update('firstName', e.target.value)}
                  placeholder=""
                  pattern="[A-Za-z\s\-]+"
                  title="English letters only"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name <span className="text-muted-foreground font-normal">(English only)</span></Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => update('lastName', e.target.value)}
                  placeholder=""
                  pattern="[A-Za-z\s\-]+"
                  title="English letters only"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder=""
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="track">สังกัด / แทรค</Label>
              <Select
                value={form.track}
                onValueChange={(v) => update('track', v as RegisterPayload['track'])}
              >
                <SelectTrigger id="track">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="training">นักเรียนที่เข้าอบรมของศูนย์วิจัยนวัตกรรมฯ</SelectItem>
                  <SelectItem value="inno_smart">นักเรียน Inno / Smart</SelectItem>
                  <SelectItem value="quota_bme">Quota Track: BME</SelectItem>
                  <SelectItem value="quota_engineer">Quota Track: Engineer</SelectItem>
                  <SelectItem value="olympic">นักเรียนความสามารถพิเศษทางวิชาการ (Olympic)</SelectItem>
                  <SelectItem value="staff">Teacher / Academic Support / BCC Staff</SelectItem>
                  <SelectItem value="customer">Customer (บุคคลทั่วไป)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="studentId">รหัสนักเรียน / รหัสเงินเดือน</Label>
                <Input
                  id="studentId"
                  value={form.studentId}
                  onChange={(e) => update('studentId', e.target.value)}
                  placeholder=""
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nid">เลขบัตรประชาชน 4 หลักสุดท้าย</Label>
                <Input
                  id="nid"
                  maxLength={4}
                  value={form.nationalIdLast4}
                  onChange={(e) => update('nationalIdLast4', e.target.value)}
                  placeholder=""
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  placeholder=""
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <div className="border-t border-border pt-6 text-sm text-center">
            <span className="text-muted-foreground">Already a member?</span>{' '}
            <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
