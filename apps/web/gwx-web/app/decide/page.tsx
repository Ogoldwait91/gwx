"use client";
import { useState } from "react";
import { decide } from "@/lib/api";

function sampleBars(){
  const base = Date.now() - 70*15*60*1000;
  const out:any[] = []; let p = 1.07;
  for (let i=0;i<70;i++){
    const ts = new Date(base + i*15*60*1000).toISOString();
    const drift = (i>50 ? 0.0003 : -0.0002);
    const noise = (Math.random()-0.5)*0.0006;
    const close = +(p + drift + noise).toFixed(5);
    const high = +(Math.max(p, close) + 0.0004).toFixed(5);
    const low  = +(Math.min(p, close) - 0.0004).toFixed(5);
    out.push({ ts, open:p, high, low, close });
    p = close;
  }
  return { symbol: "EURUSD", bars: out };
}

export default function Page(){
  const [json, setJson] = useState<string>(JSON.stringify(sampleBars(), null, 2));
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run(){
    try{
      setBusy(true); setErr(null); setRes(null);
      const body = JSON.parse(json);
      const d = await decide(body);
      setRes(d);
    }catch(e:any){
      setErr(e.message || "Failed");
    }finally{ setBusy(false); }
  }
  function loadSample(){
    setJson(JSON.stringify(sampleBars(), null, 2));
    setRes(null); setErr(null);
  }

  return (
    <div className="container-narrow space-y-4">
      <h1 className="text-2xl font-semibold">Decide</h1>
      <div className="card p-4 space-y-3">
        <div className="flex gap-2">
          <button className="btn-primary" onClick={run} disabled={busy}>{busy? "Running…" : "Run decision"}</button>
          <button className="btn" onClick={loadSample}>Load sample data</button>
        </div>
        <textarea
          className="w-full h-72 p-3 rounded-xl border border-neutral-300 font-mono text-sm"
          value={json} onChange={e=>setJson(e.target.value)}
        />
      </div>

      {err && <div className="card p-4 text-red-600">{err}</div>}
      {res && (
        <div className="card p-5">
          <div className="text-sm text-neutral-500">Result</div>
          <div className="mt-1 text-xl font-semibold">{res.symbol} · {res.side.toUpperCase()}</div>
          <div className="mt-1">size <b>{(+res.size).toFixed(2)}</b> · <span className="badge">{res.reason}</span></div>
          <div className="text-xs text-neutral-500 mt-2">ts: {res.ts}</div>
        </div>
      )}
    </div>
  );
}
