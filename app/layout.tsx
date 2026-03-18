import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";

const openSans = Open_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Yachting Advisors — Video Creator",
  description: "AI-powered yachting marketing video generator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={openSans.className} style={{ position: 'relative', zIndex: 1 }}>
        {/* Top nav bar */}
        <header style={{
          borderBottom: '1px solid var(--border)',
          background: 'rgba(7,11,20,0.9)',
          backdropFilter: 'blur(20px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          padding: '0 24px',
        }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)', boxShadow: '0 0 8px var(--blue)' }} />
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', letterSpacing: '0.02em' }}>
                YACHTING ADVISORS
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(46,163,242,0.1)', border: '1px solid rgba(46,163,242,0.2)', borderRadius: 6, padding: '2px 8px', fontWeight: 600, letterSpacing: '0.08em' }}>
                VIDEO AI
              </span>
            </div>
            <nav style={{ display: 'flex', gap: 4 }}>
              <a href="/jobs" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '6px 14px', borderRadius: 8, textDecoration: 'none' }}>
                Dashboard
              </a>
              <a href="/new" style={{ fontSize: '0.8rem', color: '#fff', background: 'var(--blue)', padding: '6px 16px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, boxShadow: '0 0 12px rgba(46,163,242,0.3)' }}>
                + New Video
              </a>
            </nav>
          </div>
        </header>
        <main style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </main>
      </body>
    </html>
  );
}
