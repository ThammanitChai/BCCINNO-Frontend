import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-white flex flex-col">

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6">
        <img src="/bcclogo.png" alt="BCC" className="h-8 w-auto" />
        <Link
          href="/login"
          className="text-sm font-medium text-purple-700 hover:text-purple-900 transition-colors"
        >
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-1.5 mb-10">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
          <span className="text-xs font-medium text-purple-600 tracking-wide uppercase">
            Bangkok Christian College · IEMS Lab
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 leading-tight whitespace-nowrap">
          Innovation &amp; <span className="text-purple-600">Invention</span> Lab
        </h1>

        <p className="mt-8 text-lg text-gray-500 max-w-xl leading-relaxed">
          ระบบจัดการห้องปฏิบัติการนวัตกรรม BCC — จองเครื่องพิมพ์ 3D ติดตามชั่วโมง และบริหารวัสดุ
        </p>

        {/* CTAs */}
        <div className="mt-12 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all"
          >
            สมัครสมาชิก
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-8 py-3.5 text-sm font-semibold text-gray-700 hover:border-purple-300 hover:text-purple-700 transition-all"
          >
            เข้าสู่ระบบ
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-3 gap-12 max-w-lg">
          <Stat n="9" label="เครื่องพิมพ์" />
          <Stat n="35" label="วัสดุ" />
          <Stat n="6" label="แทรค" />
        </div>
      </section>

      {/* Divider marquee */}
      <div className="border-t border-gray-100 py-4 overflow-hidden">
        <div className="flex whitespace-nowrap animate-[scroll_25s_linear_infinite]">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="mx-8 text-xs font-mono text-gray-300 uppercase tracking-widest flex items-center gap-8">
              BCCInno P1P · P1S · X1-Carbon · Phrozen
              <span className="text-purple-300">◆</span>
              PLA · ABS · TPU · PC-ABS · PETG
              <span className="text-purple-300">◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-8 py-6 flex justify-between items-center">
        <span className="text-xs text-gray-400">BCC IEMS Lab · Bangkok</span>
        <span className="text-xs text-gray-400">© {new Date().getFullYear()}</span>
      </footer>
    </main>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-purple-600">{n}</div>
      <div className="mt-1 text-xs text-gray-400 uppercase tracking-wide">{label}</div>
    </div>
  );
}
