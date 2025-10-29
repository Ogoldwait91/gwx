import "./globals.css";
import "./theme.css";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Goldwait Exchange",
  description: "Decision-based trading assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex h-screen bg-[var(--gwx-bg)]">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-y-auto">
            <Topbar />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
