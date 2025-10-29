"use client";
import { useState, useMemo, useEffect, ChangeEvent } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function Sparkline({ values }:{ values:number[] }){
  if(!values || values.length < 2) return null;
  const w = 600, h = 120, pad = 8;
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const step = (w - 2*pad) / (values.length - 1);
  const pts = values.map((v,i)=>{
    const x = pad + i*step;
    const y = h - pad - ((v - min) / span) * (h - 2*pad);
    return `${x},${y}`;
  }).join(" ");
  return <svg width="100%" viewBox={`0 0 ${w} ${h}`}><polyline fill="none" stroke="var(--gwx-green)" strokeWidth="2" points={pts}/></svg>;
}

export default function Page(){
  const [symbol, setSymbol] = useState("EURUSD");
  const [riskPct, setRiskPct] = useState(0.5);
  const [equity, setEquity] = useState(10000);
  const [atrMult, setAtrMult] = useState(1.5);
  const [tpR, setTpR] = useState(2.0);
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // remember
  useEffect(()=>{
    try{
      const s = localStorage.getItem("gwx_backtest");
      if(s){
        const v = JSON.parse(s);
        setSymbol(v.symbol ?? "EURUSD");
        setRiskPct(v.riskPct ?? 0.5);
        setEquity(v.equity ?? 10000);
        setAtrMult(v.atrMult ?? 1.5);
        setTpR(v.tpR ?? 2.0);
      }
    }catch{}
  },[]);
  useEffect(()=>{
    try{
      localStorage.setItem("gwx_backtest", JSON.stringify({ symbol, riskPct, equity, atrMult, tpR }));
    }catch{}
  }, [symbol, riskPct, equity, atrMult, tpR]);

  async function onCsv(e: ChangeEvent<HTMLInputElement>){
    const file = e.target.files?.[0];
    if(!file) return;
    setBusy(true); setErr(null); setRes(null);
    try{
      const text = await file.text();
      const qs = new URLSearchParams({
        symbol, risk_percent: String(riskPct), account_equity: String(equity),
        atr_mult_sl: String(atrMult), tp_r_multiple: String(tpR), min_warmup: String(60)
      }).toString();
      const r = await fetch(`${API_URL}/backtest/csv?${qs}`, { method: "POST", headers: { "Content-Type": "text/plain" }, body: text });
      if(!r.ok) throw new Error(await r.text());
      setRes(await r.json());
    }catch(e:any){ setErr(e.message ?? "Backtest failed"); }
    finally{ setBusy(false); e.target.value = ""; }
  }

  const equityCurve = useMemo(()=> {
    if(!res?.trades) return [];
    let eq = equity; const vals:number[] = [eq];
    for(const t of res.trades){ eq += t.pnl; vals.push(eq); }
    return vals;
  }, [res, equity]);

  function exportCsv(){
    if(!res?.trades || res.trades.length===0) return;
    const headers = ["entry_ts","exit_ts","side","entry","stop","take_profit","exit_price","result","r_multiple","pnl"];
    const rows = res.trades.map((t:any)=> headers.map(h=>t[h]));
    const csv = [headers.join(","), ...rows.map(r=>r.join(","))].join("\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `gwx_trades_${symbol}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="container-narrow space-y-4">
      <h1 className="text-2xl font-semibold">Backtest</h1>

      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <input className="border border-neutral-300 rounded-xl px-3 py-2 w-36" value={symbol} onChange={e=>setSymbol(e.target.value)} placeholder="Symbol" title="e.g. EURUSD"/>
          <input className="border border-neutral-300 rounded-xl px-3 py-2 w-36" type="number" step="0.1" value={riskPct} onChange={e=>setRiskPct(parseFloat(e.target.value))} title="Risk per trade (%)"/>
          <span className="text-sm">Risk per trade (%)</span>
          <input className="border border-neutral-300 rounded-xl px-3 py-2 w-44" type="number" step="100" value={equity} onChange={e=>setEquity(parseFloat(e.target.value))} title="Account size (£)"/>
          <span className="text-sm">Account size (£)</span>
          <input className="border border-neutral-300 rounded-xl px-3 py-2 w-40" type="number" step="0.1" value={atrMult} onChange={e=>setAtrMult(parseFloat(e.target.value))} title="Stop distance (ATR×)"/>
          <span className="text-sm">Stop distance (ATR×)</span>
          <input className="border border-neutral-300 rounded-xl px-3 py-2 w-40" type="number" step="0.1" value={tpR} onChange={e=>setTpR(parseFloat(e.target.value))} title="Take-profit (R)"/>
          <span className="text-sm">Take-profit (R)</span>
          <label className="btn cursor-pointer ml-auto" title="Upload CSV with ts,open,high,low,close,volume">
            Upload CSV
            <input type="file" accept=".csv,text/csv" onChange={onCsv} className="hidden" />
          </label>
        </div>
        <p className="text-xs text-neutral-500">CSV columns: <code>ts,open,high,low,close,volume</code>. Tip: export ~100 bars so indicators warm up.</p>
      </div>

      {err && <div className="card p-4 text-red-600 whitespace-pre-wrap">{err}</div>}

      {res && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="card p-4"><div className="text-xs text-neutral-500">Trades</div><div className="text-2xl font-semibold">{res.count}</div></div>
            <div className="card p-4"><div className="text-xs text-neutral-500">Win rate</div><div className="text-2xl font-semibold">{(res.winrate ?? 0).toFixed(1)}%</div></div>
            <div className="card p-4"><div className="text-xs text-neutral-500">Net P/L</div><div className="text-2xl font-semibold">£{(res.net_pnl ?? 0).toFixed(2)}</div></div>
            <div className="card p-4"><div className="text-xs text-neutral-500">Equity (end)</div><div className="text-2xl font-semibold">£{(res.equity_end ?? 0).toFixed(2)}</div></div>
          </div>

          <div className="card p-4">
            <div className="text-xs text-neutral-500 mb-2">Equity curve</div>
            <Sparkline values={equityCurve}/>
          </div>

          <div className="flex gap-2">
            <button className="btn" onClick={exportCsv} title="Download your trades as CSV">Export trades CSV</button>
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-100 text-neutral-700">
                <tr>
                  <th className="text-left px-3 py-2">Entry time</th>
                  <th className="text-left px-3 py-2">Exit time</th>
                  <th className="text-left px-3 py-2">Direction</th>
                  <th className="text-left px-3 py-2">Entry</th>
                  <th className="text-left px-3 py-2">Stop</th>
                  <th className="text-left px-3 py-2">Take-profit</th>
                  <th className="text-left px-3 py-2">Exit</th>
                  <th className="text-left px-3 py-2">Outcome</th>
                  <th className="text-left px-3 py-2">R</th>
                  <th className="text-left px-3 py-2">P/L (£)</th>
                </tr>
              </thead>
              <tbody>
                {(res.trades ?? []).map((t:any, i:number)=>(
                  <tr key={i} className="border-t border-neutral-200">
                    <td className="px-3 py-2">{t.entry_ts}</td>
                    <td className="px-3 py-2">{t.exit_ts}</td>
                    <td className="px-3 py-2 uppercase">{t.side}</td>
                    <td className="px-3 py-2">{t.entry.toFixed(5)}</td>
                    <td className="px-3 py-2">{t.stop.toFixed(5)}</td>
                    <td className="px-3 py-2">{t.take_profit.toFixed(5)}</td>
                    <td className="px-3 py-2">{t.exit_price.toFixed(5)}</td>
                    <td className="px-3 py-2 uppercase">{t.result}</td>
                    <td className="px-3 py-2">{t.r_multiple.toFixed(2)}R</td>
                    <td className="px-3 py-2">£{t.pnl.toFixed(2)}</td>
                  </tr>
                ))}
                {(!res.trades || res.trades.length===0) && (
                  <tr><td colSpan={10} className="px-3 py-4 text-neutral-500">No trades generated.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
