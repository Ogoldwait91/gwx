"use client";
import { useUser } from "@/hooks/useUser";

export default function Topbar() {
  const [user] = useUser();
  return (
    <header className="flex justify-between items-center bg-white border-b border-neutral-200 px-6 py-3 sticky top-0 z-40">
      <h1 className="text-lg font-semibold tracking-tight text-neutral-800">Goldwait Exchange</h1>
      <div className="hidden sm:flex items-center gap-6">
        <div className="text-sm text-neutral-500">
          <span className="font-medium text-neutral-800">Equity:</span> £{user.equity.toLocaleString()}
        </div>
        <div className="text-sm text-neutral-500">
          <span className="font-medium text-neutral-800">Mode:</span> {user.mode}
        </div>
      </div>
    </header>
  );
}
