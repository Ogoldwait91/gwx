"use client";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Row = { ts:string; symbol:string; side:string; reason:string; size:number; created_at:string };

export default function Page(){
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [limit, setLimit] = useState(50);

  useEffect(()=>{
    let alive = true;
    (async ()=>{
      try{
        const r = await fetch(`${API_URL}/decisions/recent?limit=${limit}`, { cache: "no-store" });
        if(!r.ok) throw new Error(await r.text());
        const j = await r.json();
        if(!alive) return;
        setRows(j.items || []);
      }catch(e:any){
        if(!alive) return;
        setErr(e.message || "Failed to load history");
      }
    })();
    return ()=>{ alive = false; }
  }, [limit]);

  return (
    <div className="container-narrow space-y-4">
      <h1 className="text-2xl font-semibold">History</h1>

      <div className="card p-4 flex items-center gap-2">
        <span className="text-sm">Show</span>
        <select className="border border-neutral-300 rounded-xl px-3 py-2" value={limit} onChange={e=>setLimit(parseInt(e.target.value))}>
          {[20,50,100,200].map(n=><option key={n} value={n}>{n}</option>)}
        </select>
        <span className="text-sm">recent decisions</span>
      </div>

      {err && <div className="card p-4 text-red-600">{err}</div>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100 text-neutral-700">
            <tr>
              <th className="text-left px-3 py-2">Time</th>
              <th className="text-left px-3 py-2">Symbol</th>
              <th className="text-left px-3 py-2">Side</th>
              <th className="text-left px-3 py-2">Size</th>
              <th className="text-left px-3 py-2">Reason</th>
              <th className="text-left px-3 py-2">Recorded</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i} className="border-t border-neutral-200">
                <td className="px-3 py-2">{r.ts}</td>
                <td className="px-3 py-2">{r.symbol}</td>
                <td className="px-3 py-2 uppercase">{r.side}</td>
                <td className="px-3 py-2">{(r.size ?? 0).toFixed(2)}</td>
                <td className="px-3 py-2">{r.reason}</td>
                <td className="px-3 py-2">{r.created_at}</td>
              </tr>
            ))}
            {rows.length===0 && (
              <tr><td colSpan={6} className="px-3 py-4 text-neutral-500">No decisions yet. Run one on the Decide page.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
