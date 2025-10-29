"use client";
import { useState, ChangeEvent } from "react";
import { decide, decideCsv } from "@/lib/api";

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
  const [csvSymbol, setCsvSymbol] = useState("EURUSD");

  async function runJson(){
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

  async function onCsvChange(e: ChangeEvent<HTMLInputElement>){
    const file = e.target.files?.[0];
    if(!file) return;
    setBusy(true); setErr(null); setRes(null);
    try{
      const text = await file.text();
      const d = await decideCsv(csvSymbol, text);
      setRes(d);
    }catch(e:any){
      setErr(e.message || "CSV failed");
    }finally{ setBusy(false); e.target.value = ""; }
  }

  const above = res ? res.price > res.sma : false;

  return (
    <div className="container-narrow space-y-4">
      <h1 className="text-2xl font-semibold">Decide</h1>

      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={runJson} disabled={busy}>{busy? "Running…" : "Run decision (JSON)"}</button>
          <button className="btn" onClick={loadSample}>Load sample data</button>

          <div className="ml-auto flex items-center gap-2">
            <input
              className="border border-neutral-300 rounded-xl px-3 py-2 w-36"
              value={csvSymbol}
              onChange={e=>setCsvSymbol(e.target.value)}
              placeholder="Symbol e.g. EURUSD"
            />
            <label className="btn cursor-pointer">
              Upload CSV
              <input type="file" accept=".csv,text/csv" onChange={onCsvChange} className="hidden" />
            </label>
          </div>
        </div>

        <textarea
          className="w-full h-72 p-3 rounded-xl border border-neutral-300 font-mono text-sm"
          value={json} onChange={e=>setJson(e.target.value)}
        />

        <p className="text-xs text-neutral-500">
          CSV format: <code>ts,open,high,low,close,volume</code>
        </p>
      </div>

      {err && <div className="card p-4 text-red-600">{err}</div>}

      {res && (
        <div className="card p-5 space-y-3">
          <div className="text-sm text-neutral-500">Result</div>
          <div className="mt-1 text-xl font-semibold">{res.symbol} · {res.side.toUpperCase()}</div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="border border-neutral-200 rounded-xl p-3">
              <div className="text-xs text-neutral-500">RSI(14)</div>
              <div className="text-lg font-semibold">{res.rsi.toFixed(2)}</div>
            </div>
            <div className="border border-neutral-200 rounded-xl p-3">
              <div className="text-xs text-neutral-500">SMA(50)</div>
              <div className="text-lg font-semibold">{res.sma.toFixed(5)}</div>
            </div>
            <div className="border border-neutral-200 rounded-xl p-3">
              <div className="text-xs text-neutral-500">Last Price</div>
              <div className="text-lg font-semibold">{res.price.toFixed(5)}</div>
            </div>
          </div>

          <div className="text-sm">
            size <b>{(+res.size).toFixed(2)}</b> · <span className="badge">{res.reason}</span> ·{" "}
            <span className={"badge " + (above ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-700")}>
              {above ? "Above SMA" : "Below/Equal SMA"}
            </span>
          </div>

          <div className="text-xs text-neutral-500">ts: {res.ts}</div>
        </div>
      )}
    </div>
  );
}
