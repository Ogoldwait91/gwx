"use client";
import { useEffect, useState } from "react";

type EventOut = {
  id: string; time_utc: string; country: string; category: string;
  importance: number; consensus: number; unit: string; has_actual: boolean;
};

type Signal = {
  event_id: string; country: string; category: string; consensus: number; actual: number; unit: string;
  z: number; impact: number; regime: string; symbol: string;
  playbook: { mode:string; side:string|null; entry:string; stop:string; tp1:string|null; tp2:string|null; notes:string; };
  sizing_pct: number; confirmed: boolean; confirm_reasons: string[];
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Page() {
  const [events, setEvents] = useState<EventOut[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/events`).then(r=>r.json()).then(setEvents).catch(()=>setEvents([]));
  }, []);

  const runDecisions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/run-decisions`, { method: "POST" });
      const data = await res.json();
      setSignals(data.signals || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0b1220] text-white">
      <header className="border-b border-white/10 p-6">
        <h1 className="text-2xl font-semibold">GWX - Goldwait Exchange</h1>
        <p className="text-sm text-white/70">Powered by the Goldwait Decision Engine (GDE)</p>
      </header>

      <div className="p-6 grid gap-8 md:grid-cols-2">
        <section className="bg-white/5 rounded-xl p-4">
          <h2 className="text-lg font-medium mb-3">Today's Events</h2>
          <table className="w-full text-sm">
            <thead className="text-white/60">
              <tr><th className="text-left">Time (UTC)</th><th>Event</th><th>Imp</th><th>Cons</th><th>Actual</th></tr>
            </thead>
            <tbody>
              {events.map(e=>(
                <tr key={e.id} className="border-t border-white/10">
                  <td className="py-2">{new Date(e.time_utc).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</td>
                  <td className="text-white/90">{e.country} {e.category}</td>
                  <td className="text-center">{e.importance}</td>
                  <td className="text-right">{e.consensus}{e.unit}</td>
                  <td className="text-right">{e.has_actual ? "YES" : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={runDecisions}
            disabled={loading}
            className="mt-4 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50">
            {loading ? "Running..." : "Run Decisions"}
          </button>
        </section>

        <section className="bg-white/5 rounded-xl p-4">
          <h2 className="text-lg font-medium mb-3">Signals</h2>
          <div className="space-y-3">
            {signals.length===0 && <div className="text-white/60">No signals yet. Click "Run Decisions".</div>}
            {signals.map((s,i)=>(
              <div key={i} className="rounded-lg p-3 border border-white/10">
                <div className="text-sm text-white/70">{s.country} {s.category} — z {s.z} • impact {s.impact} • {s.regime}</div>
                <div className="text-base mt-1">
                  <span className="font-semibold">{s.symbol}</span> — {s.playbook.mode.toUpperCase()} {s.playbook.side||""}
                </div>
                <div className="text-sm mt-1">Entry: {s.playbook.entry}</div>
                <div className="text-sm">SL: {s.playbook.stop} • TP1: {s.playbook.tp1} • {s.playbook.tp2||""}</div>
                <div className="text-sm mt-1">Risk: {s.sizing_pct}% • Confirm: {s.confirmed ? "Yes" : "No"} {s.confirm_reasons.join(", ")}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
