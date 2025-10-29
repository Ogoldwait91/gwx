"use client";
import { useEffect, useState } from "react";
import NewsTicker from "@/components/NewsTicker";
import { useUser } from "@/hooks/useUser";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function DashboardPage() {
  const [user] = useUser();
  const [stats, setStats] = useState({ trades: 0, winrate: 0, avgScore: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_URL}/decisions/recent?limit=5`, { cache: "no-store" });
        const j = await r.json();
        const items = j.items || [];
        setRecent(items);
        const wins = items.filter((x:any) => (x.side || "").toLowerCase() === "buy" || (x.side || "").toLowerCase() === "sell").length;
        setStats({
          trades: items.length,
          winrate: items.length ? Math.round((wins / items.length) * 100) : 0,
          avgScore: Math.round(Math.random() * 50 + 25), // placeholder until we store score in DB
        });
      } catch {
        setRecent([]);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <NewsTicker />

      {/* Account summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="text-sm text-neutral-500">Account Balance</div>
          <div className="text-2xl font-semibold text-emerald-700 mt-1">£{user.equity.toLocaleString()}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-neutral-500">Open Risk</div>
          <div className="text-2xl font-semibold text-amber-600 mt-1">£250</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-neutral-500">Month P&L</div>
          <div className="text-2xl font-semibold text-emerald-700 mt-1">+£642</div>
        </div>
      </div>

      {/* Performance overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="text-sm text-neutral-500">Total Trades</div>
          <div className="text-2xl font-semibold">{stats.trades}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-neutral-500">Win Rate</div>
          <div className="text-2xl font-semibold text-emerald-600">{stats.winrate}%</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-neutral-500">Average GWX Score</div>
          <div className="text-2xl font-semibold text-blue-600">{stats.avgScore}</div>
        </div>
      </div>

      {/* Recent decisions table */}
      <div className="card overflow-x-auto p-5">
        <div className="text-sm text-neutral-500 mb-3 font-medium">Recent Decisions</div>
        <table className="w-full text-sm">
          <thead className="bg-neutral-100 text-neutral-700">
            <tr>
              <th className="text-left px-3 py-2">Symbol</th>
              <th className="text-left px-3 py-2">Side</th>
              <th className="text-left px-3 py-2">Size</th>
              <th className="text-left px-3 py-2">Reason</th>
              <th className="text-left px-3 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((r:any, i:number) => (
              <tr key={i} className="border-t border-neutral-200">
                <td className="px-3 py-2">{r.symbol}</td>
                <td className={`px-3 py-2 font-medium ${
                  r.side === "buy" ? "text-emerald-600" :
                  r.side === "sell" ? "text-red-600" :
                  "text-neutral-600"
                }`}>{r.side?.toUpperCase?.()}</td>
                <td className="px-3 py-2">{(r.size ?? 0).toFixed(2)}</td>
                <td className="px-3 py-2">{r.reason}</td>
                <td className="px-3 py-2 text-neutral-500">{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-4 text-neutral-500 text-center">No recent decisions yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


