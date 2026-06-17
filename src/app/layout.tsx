import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Dropbox Referral Booster", description: "Otomatiskan penambahan kapasitas Dropbox melalui link referral" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">{children}</body>
    </html>
  );
}
