import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/site-header';
import { ArrowRight, Cpu, Activity, BarChart3, Layers } from 'lucide-react';

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="relative overflow-hidden">
        {/* Hero */}
        <section className="relative grain border-b border-border/60">
          <div className="absolute inset-0 -z-10 opacity-60">
            <div className="absolute top-20 right-10 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
            <div className="absolute -bottom-20 left-10 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          </div>

          <div className="mx-auto max-w-7xl px-6 pt-20 pb-32 lg:pt-32 lg:pb-44">
            <div className="grid lg:grid-cols-12 gap-12 items-end">
              <div className="lg:col-span-8">
                <div className="flex items-center gap-3 mb-8">
                  <span className="dot dot-available animate-pulse" />
                  <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                    System online · Bangkok Christian College
                  </span>
                </div>

                <h1 className="font-display text-[clamp(3rem,9vw,8rem)] leading-[0.9] tracking-tight">
                  <span className="block">Innovation</span>
                  <span className="block">
                    <span className="italic font-light">&amp;</span>{' '}
                    <span className="text-accent">Invention</span>
                  </span>
                  <span className="block">Lab.</span>
                </h1>

                <div className="mt-10 max-w-xl">
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    A management platform for the IEMS research center —{' '}
                    <span className="text-foreground">3D printing, prototyping, and material logistics</span>
                    {' '}for the BCC Biomedical and Engineering tracks.
                  </p>
                </div>

                <div className="mt-12 flex flex-wrap items-center gap-4">
                  <Button asChild size="lg" className="group">
                    <Link href="/register">
                      Become a member
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/login">Sign in</Link>
                  </Button>
                </div>
              </div>

              {/* Stat block */}
              <div className="lg:col-span-4">
                <div className="border-l-2 border-accent pl-6 space-y-8">
                  <Stat n="07" label="3D printers in fleet" />
                  <Stat n="2" label="Engineering tracks" />
                  <Stat n="24/7" label="Lab availability" />
                </div>
              </div>
            </div>
          </div>

          {/* Marquee divider */}
          <div className="border-y border-border/60 py-3 overflow-hidden">
            <div className="flex animate-[shimmer_30s_linear_infinite] whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i} className="mx-8 flex items-center gap-8">
                  Bambu Lab P1P · P1S · X1-Carbon
                  <span className="text-accent">◆</span>
                  PLA · ABS · PETG · TPU · PC-ABS
                  <span className="text-accent">◆</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-7xl px-6 py-24">
          <div className="mb-16 max-w-2xl">
            <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              § 01 — Platform
            </span>
            <h2 className="mt-4 font-display text-5xl tracking-tight">
              Built for the BCC engineering studio.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
            <Feature
              icon={<Cpu className="h-5 w-5" />}
              num="01"
              title="Member quotas"
              text="Track-based monthly hour allocation, automatically applied at registration. Biomedical 16h, Engineer 8h."
            />
            <Feature
              icon={<Activity className="h-5 w-5" />}
              num="02"
              title="Live check-in"
              text="QR-based session tracking. Real-time printer occupancy, conflict detection, automatic hour deduction."
            />
            <Feature
              icon={<Layers className="h-5 w-5" />}
              num="03"
              title="Material logistics"
              text="Filament inventory by brand, color, and stock level. Low-stock alerts. Cost-per-gram pricing built in."
            />
            <Feature
              icon={<BarChart3 className="h-5 w-5" />}
              num="04"
              title="Utilization insights"
              text="Per-printer load, track-level engagement, daily completion rate. Admin dashboard with full audit trail."
            />
          </div>
        </section>

        {/* Tracks */}
        <section className="border-t border-border/60 bg-secondary/40">
          <div className="mx-auto max-w-7xl px-6 py-24 grid lg:grid-cols-2 gap-16">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                § 02 — Membership
              </span>
              <h2 className="mt-4 font-display text-5xl tracking-tight">
                Membership.
              </h2>
              <p className="mt-6 text-muted-foreground leading-relaxed max-w-md">
                Members register through a structured onboarding flow that assigns track-specific allocation.
                Use the printers, log materials, and let the system handle the bookkeeping.
              </p>
            </div>

            <div className="space-y-px">
              <TrackCard
                code="BIO"
                name="Biomedical Engineering"
                hours="16h"
                detail="Per term · Includes resin and PLA Pro access"
              />
              <TrackCard
                code="ENG"
                name="Engineering"
                hours="8h"
                detail="Per term · FDM access with all standard filaments"
              />
              <TrackCard
                code="STAFF"
                name="BCC Staff"
                hours="As approved"
                detail="Per request basis · Approved by lab administrator"
              />
            </div>
          </div>
        </section>

        <footer className="border-t border-border/60 py-12">
          <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between gap-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            <span>BCC IEMS Lab · Bangkok, TH 10500</span>
            <span>© {new Date().getFullYear()} · Crafted in Bangkok</span>
          </div>
        </footer>
      </main>
    </>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div className="font-display text-5xl numeric tracking-tight">{n}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function Feature({
  icon,
  num,
  title,
  text,
}: {
  icon: React.ReactNode;
  num: string;
  title: string;
  text: string;
}) {
  return (
    <div className="bg-background p-8 hover:bg-secondary/50 transition-colors group">
      <div className="flex items-start justify-between mb-8">
        <div className="rounded-md border border-border p-2 group-hover:border-accent group-hover:text-accent transition-colors">
          {icon}
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {num}
        </span>
      </div>
      <h3 className="font-display text-xl mb-3">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}

function TrackCard({
  code,
  name,
  hours,
  detail,
}: {
  code: string;
  name: string;
  hours: string;
  detail: string;
}) {
  return (
    <div className="bg-background p-6 flex items-center gap-6 hover:bg-card transition-colors">
      <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground w-16">
        {code}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display text-xl">{name}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{detail}</div>
      </div>
      <div className="font-display text-3xl tracking-tight numeric text-accent">{hours}</div>
    </div>
  );
}
