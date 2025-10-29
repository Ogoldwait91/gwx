"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

function NavItem({ href, label }: { href: string; label: string }) {
  const active = usePathname() === href;
  return (
    <Link
      href={href}
      className={`block px-3 py-2 rounded-lg transition-colors ${
        active ? "bg-emerald-50 text-emerald-700" : "text-neutral-700 hover:bg-neutral-100"
      }`}
    >
      {label}
    </Link>
  );
}

export default function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-neutral-200 p-4 space-y-2">
      <div className="mb-4"><img src="/gwx-logo.svg" alt="GWX" width={140}/></div>
      <NavItem href="/" label="Dashboard" />
      <NavItem href="/decide" label="Decision Engine" />
      <NavItem href="/backtest" label="Backtest" />
      <NavItem href="/history" label="History" />
      <div className="mt-auto border-t pt-3">
        <NavItem href="/settings" label="Settings" />
      </div>
    </aside>
  );
}
