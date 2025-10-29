"use client";
import { useState, ChangeEvent } from "react";
import { decide, decideCsv, ordersProposed } from "@/lib/api";

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

  const [riskPct, setRiskPct] = useState(0.5);
  const [equity, setEquity] = useState(10000);
  const [atrMult, setAtrMult] = useState(1.5);
  const [tpR, setTpR] = useState(2.0);
  const [order, setOrder] = useState<any>(null);
  const [orderErr, setOrderErr] = useState<string | null>(null);

  async function runJson(){
    try{
      setBusy(true); setErr(null); setRes(null); setOrder(null);
      const body = JSON.parse(json);
      const d = await decide(body);
      setRes(d);
    }catch(e:any){
      setErr(e.message || "Failed");
    }finally{ setBusy(false); }
  }

  function loadSample(){
    setJson(JSON.stringify(sampleBars(), null, 2));
    setRes(null); setErr(null); setOrder(null); setOrderErr(null);
  }

  async function onCsvChange(e: ChangeEvent<HTMLInputElement>){
    const file = e.target.files?.[0];
    if(!file) return;
    setBusy(true); setErr(null); setRes(null); setOrder(null);
    try{
      const text = await file.text();
      const d = await decideCsv(csvSymbol, text);
      setRes(d);
    }catch(e:any){
      setErr(e.message || "CSV failed");
    }finally{ setBusy(false); e.target.value = ""; }
  }

  async function propose(){
    try{
      setOrderErr(null); setOrder(null);
      const body = JSON.parse(json);
      const o = await ordersProposed({
        symbol: body.symbol || "EURUSD",
        risk_percent: riskPct,
        account_equity: equity,
        atr_mult_sl: atrMult,
        tp_r_multiple: tpR,
        body
      });
      setOrder(o);
    }catch(e:any){
      setOrderErr(e.message || "Order proposal failed");
    }
  }

  const above = res ? res.price > res.sma : false;

  return (
    <div className="container-narrow space-y-4">
      <h1 className="text-2xl font-semibold">Decide</h1>

      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={runJson} disabled={busy}>{busy? "Running…" : "Run decision"}</button>
          <button className="btn" onClick={loadSample}>Load sample data</button>

        <div className="ml-auto flex items-center gap-2">
            <input className="border border-neutral-300 rounded-xl px-3 py-2 w-36" value={csvSymbol} onChange={e=>setCsvSymbol(e.target.value)} placeholder="Symbol e.g. EURUSD"/>
            <label className="btn cursor-pointer">
              Upload CSV
              <input type="file" accept=".csv,text/csv" onChange={onCsvChange} className="hidden" />
            </label>
          </div>
        </div>

        <p className="text-xs text-neutral-500">
          1) Click <b>Run decision</b> to get the signal (Long / Short / Flat). 2) Set how much you’re willing to risk on this trade
          as a % of your account, then click <b>Propose Order</b> to see Entry, Stop-loss and Take-profit. You can paste JSON candles
          below, or upload a CSV instead.
        </p>

        <textarea className="w-full h-72 p-3 rounded-xl border border-neutral-300 font-mono text-sm" value={json} onChange={e=>setJson(e.target.value)} />
      </div>

      {err && <div className="card p-4 text-red-600">{err}</div>}

      {res && (
        <div className="card p-5 space-y-3">
          <div className="text-sm text-neutral-500">Result</div>
          <div className="mt-1 text-xl font-semibold">{res.symbol} · {res.side?.toUpperCase?.()}</div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="border border-neutral-200 rounded-xl p-3">
              <div className="text-xs text-neutral-500">RSI (strength 0–100)</div>
              <div className="text-lg font-semibold">{res.rsi == null ? "—" : res.rsi.toFixed(2)}</div>
            </div>
            <div className="border border-neutral-200 rounded-xl p-3">
              <div className="text-xs text-neutral-500">50-bar average price</div>
              <div className="text-lg font-semibold">{res.sma == null ? "—" : res.sma.toFixed(5)}</div>
            </div>
            <div className="border border-neutral-200 rounded-xl p-3">
              <div className="text-xs text-neutral-500">Last price</div>
              <div className="text-lg font-semibold">{res.price == null ? "—" : res.price.toFixed(5)}</div>
            </div>
          </div>

          <div className="text-sm">
            position size suggestion <b>{(+(res.size ?? 0)).toFixed(2)}</b> · <span className="badge">{res.reason}</span> ·{" "}
            <span className={"badge " + (above ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-700")}>
              {above ? "Price above average" : "Price at/below average"}
            </span>
          </div>

          <div className="mt-4 border-t border-neutral-200 pt-4">
            <div className="text-sm text-neutral-500 mb-2">Order proposal</div>
            <div className="flex flex-wrap gap-2 items-center">
              <input className="border border-neutral-300 rounded-xl px-3 py-2 w-36" type="number" step="0.1" value={riskPct} onChange={e=>setRiskPct(parseFloat(e.target.value))} />
              <span className="text-sm">Risk per trade (%)</span>
              <input className="border border-neutral-300 rounded-xl px-3 py-2 w-40" type="number" step="100" value={equity} onChange={e=>setEquity(parseFloat(e.target.value))} />
              <span className="text-sm">Account size (£)</span>
              <input className="border border-neutral-300 rounded-xl px-3 py-2 w-36" type="number" step="0.1" value={atrMult} onChange={e=>setAtrMult(parseFloat(e.target.value))} />
              <span className="text-sm">Stop distance (ATR×)</span>
              <input className="border border-neutral-300 rounded-xl px-3 py-2 w-36" type="number" step="0.1" value={tpR} onChange={e=>setTpR(parseFloat(e.target.value))} />
              <span className="text-sm">Take-profit (R multiples)</span>
              <button className="btn" onClick={propose}>Propose Order</button>
            </div>

            {orderErr && <div className="text-red-600 mt-2">{orderErr}</div>}
            {order && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <div className="border border-neutral-200 rounded-xl p-3">
                  <div className="text-xs text-neutral-500">Entry</div>
                  <div className="text-lg font-semibold">{order.entry.toFixed(5)}</div>
                </div>
                <div className="border border-neutral-200 rounded-xl p-3">
                  <div className="text-xs text-neutral-500">Stop-loss</div>
                  <div className="text-lg font-semibold">{order.stop.toFixed(5)}</div>
                </div>
                <div className="border border-neutral-200 rounded-xl p-3">
                  <div className="text-xs text-neutral-500">Take-profit</div>
                  <div className="text-lg font-semibold">{order.take_profit.toFixed(5)}</div>
                </div>
                <div className="border border-neutral-200 rounded-xl p-3">
                  <div className="text-xs text-neutral-500">ATR (volatility)</div>
                  <div className="text-lg font-semibold">{order.atr.toFixed(5)}</div>
                </div>
                <div className="border border-neutral-200 rounded-xl p-3">
                  <div className="text-xs text-neutral-500">Risk £</div>
                  <div className="text-lg font-semibold">£{order.risk_amount.toFixed(2)}</div>
                </div>
                <div className="border border-neutral-200 rounded-xl p-3">
                  <div className="text-xs text-neutral-500">Position size (fraction)</div>
                  <div className="text-lg font-semibold">{(order.size_fraction*100).toFixed(1)}%</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
