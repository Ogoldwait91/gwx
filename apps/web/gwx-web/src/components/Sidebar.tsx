"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NavItem = ({href,label}:{href:string; label:string})=>{
  const path = usePathname();
  const active = path===href;
  return (
    <Link href={href} className={`block rounded-xl px-3 py-2 ${active ? "bg-emerald-700 text-white" : "hover:bg-neutral-100"}`}>
      {label}
    </Link>
  );
}

export default function Sidebar(){
  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 p-4 bg-white border-r border-neutral-200">
      <div className="mb-6">
        <div className="text-2xl font-semibold text-emerald-800">GWX</div>
        <div className="text-sm text-neutral-500">Goldwait Exchange</div>
      </div>
      <nav className="space-y-1">
        <NavItem href="/" label="Dashboard" />
        <NavItem href="/decide" label="Decide" />
        <NavItem href="/history" label="History" />
        <NavItem href="/settings" label="Settings" />
      </nav>
      <div className="mt-6 text-xs text-neutral-500">v0.1 • internal</div>
    </aside>
  );
}
