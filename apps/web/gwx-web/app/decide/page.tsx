"use client";
import { useEffect, useState, ChangeEvent, useMemo } from "react";
import { decide, decideCsv, ordersProposed } from "@/lib/api";

const PRESETS = [
  { label: "EUR/USD (15m)", symbol: "EURUSD" },
  { label: "GBP/USD (15m)", symbol: "GBPUSD" },
  { label: "Gold XAU/USD (15m)", symbol: "XAUUSD" },
  { label: "S&P 500 CFD (15m)", symbol: "US500" }
];

function sampleBars(symbol="EURUSD"){
  const base = Date.now() - 220*15*60*1000;
  const out:any[] = []; let p = 1.07;
  for (let i=0;i<220;i++){
    const ts = new Date(base + i*15*60*1000).toISOString();
    const drift = (i>120 ? 0.00015 : -0.00010);
    const noise = (Math.random()-0.5)*0.0004;
    const close = +(p + drift + noise).toFixed(5);
    const high = +(Math.max(p, close) + 0.0003).toFixed(5);
    const low  = +(Math.min(p, close) - 0.0003).toFixed(5);
    out.push({ ts, open:p, high, low, close });
    p = close;
  }
  return { symbol, bars: out };
}

export default function Page(){
  const [json, setJson] = useState<string>(JSON.stringify(sampleBars(), null, 2));
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  const [riskPct, setRiskPct] = useState(0.5);
  const [equity, setEquity] = useState(10000);
  const [atrMult, setAtrMult] = useState(1.5);
  const [tpR, setTpR] = useState(2.0);
  const [minScore, setMinScore] = useState(12);
  const [order, setOrder] = useState<any>(null);
  const [orderErr, setOrderErr] = useState<string | null>(null);
  const [preset, setPreset] = useState(PRESETS[0].symbol);

  // Risk simulator sliders
  const [assumedWinRate, setAssumedWinRate] = useState(45); // %
  const [numTrades, setNumTrades] = useState(20);           // count

  // remember settings
  useEffect(()=>{
    try{
      const s = localStorage.getItem("gwx_settings");
      if(s){
        const v = JSON.parse(s);
        setRiskPct(v.riskPct ?? 0.5);
        setEquity(v.equity ?? 10000);
        setAtrMult(v.atrMult ?? 1.5);
        setTpR(v.tpR ?? 2.0);
        setMinScore(v.minScore ?? 12);
        setPreset(v.preset ?? PRESETS[0].symbol);
        setAssumedWinRate(v.assumedWinRate ?? 45);
        setNumTrades(v.numTrades ?? 20);
      }
    }catch{}
  },[]);
  useEffect(()=>{
    try{
      localStorage.setItem("gwx_settings", JSON.stringify({ riskPct, equity, atrMult, tpR, minScore, preset, assumedWinRate, numTrades }));
    }catch{}
  }, [riskPct, equity, atrMult, tpR, minScore, preset, assumedWinRate, numTrades]);

  function applyPreset(sym:string){
    setPreset(sym);
    setJson(JSON.stringify(sampleBars(sym), null, 2));
    setRes(null); setErr(null); setOrder(null); setOrderErr(null);
  }

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

  async function onCsvChange(e: ChangeEvent<HTMLInputElement>){
    const file = e.target.files?.[0]; if(!file) return;
    setBusy(true); setErr(null); setRes(null); setOrder(null);
    try{
      const text = await file.text();
      const d = await decideCsv(preset, text);
      setRes(d);
    }catch(e:any){ setErr(e.message || "CSV failed"); }
    finally{ setBusy(false); e.target.value = ""; }
  }

  async function propose(){
    try{
      setOrderErr(null); setOrder(null);
      if(!res){ setOrderErr("Run a decision first."); return; }
      const score = res?.score ?? 0;
      const side = res?.side ?? "flat";
      if(Math.abs(score) < minScore || side === "flat"){
        setOrderErr(`No trade – GWX Score ${Math.round(score)} is below your threshold (${minScore}).`);
        return;
      }
      const body = JSON.parse(json);
      const o = await ordersProposed({
        symbol: body.symbol || preset,
        risk_percent: riskPct,
        account_equity: equity,
        atr_mult_sl: atrMult,
        tp_r_multiple: tpR,
        body
      });
      setOrder(o);
    }catch(e:any){ setOrderErr(e.message || "Order proposal failed"); }
  }

  const score = res?.score ?? 0;
  const riskAmount = useMemo(()=> (equity * (riskPct/100)), [equity, riskPct]);
  const potentialWin = useMemo(()=> (riskAmount * tpR), [riskAmount, tpR]);
  const breakevenWR = useMemo(()=> (100 * (1/(tpR+1))), [tpR]); // classic R-multiple BE

  // simple Monte-Carlo style text summary (not plotting; just percentiles)
  const mcSummary = useMemo(()=>{
    // distribution of net P&L over N trades with win prob p and payoff +tpR*R / -1*R
    const R = riskAmount;
    const p = Math.min(0.99, Math.max(0.01, assumedWinRate/100));
    const n = Math.min(200, Math.max(5, numTrades));
    const runs = 400; // light
    const results:number[] = [];
    for(let r=0;r<runs;r++){
      let pnl = 0;
      for(let i=0;i<n;i++){
        const win = Math.random() < p;
        pnl += win ? R*tpR : -R;
      }
      results.push(pnl);
    }
    results.sort((a,b)=>a-b);
    const pick = (q:number)=> results[Math.floor(q*(results.length-1))];
    const p10 = pick(0.10), p50 = pick(0.50), p90 = pick(0.90);
    return { p10, p50, p90, n };
  }, [riskAmount, assumedWinRate, numTrades, tpR]);

  const above = res ? res.price > res.sma : false;

  return (
    <div className="container-narrow space-y-4">
      <h1 className="text-2xl font-semibold">Decide</h1>

      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <select className="border border-neutral-300 rounded-xl px-3 py-2" value={preset} onChange={e=>applyPreset(e.target.value)} title="Choose a market preset">
            {PRESETS.map(p=> <option key={p.symbol} value={p.symbol}>{p.label}</option>)}
          </select>
          <button className="btn" onClick={()=>setJson(JSON.stringify(sampleBars(preset), null, 2))} title="Loads example candles">Load sample data</button>
          <button className="btn-primary" onClick={runJson} disabled={busy} title="Analyse the loaded candles">{busy? "Running…" : "Run decision"}</button>

          <div className="ml-auto flex items-center gap-2">
            <label className="btn cursor-pointer" title="Upload a CSV with columns ts,open,high,low,close,volume">
              Upload CSV
              <input type="file" accept=".csv,text/csv" onChange={onCsvChange} className="hidden" />
            </label>
          </div>
        </div>

        <p className="text-xs text-neutral-500">
          1) Run the signal. 2) Set your risk per trade (% of your account). 3) Propose Order → Entry, Stop, Take-profit.
        </p>

        <textarea className="w-full h-48 p-3 rounded-xl border border-neutral-300 font-mono text-sm"
                  title="Advanced: paste candles JSON here"
                  value={json} onChange={e=>setJson(e.target.value)} />
      </div>

      {err && <div className="card p-4 text-red-600">{err}</div>}

      {res && (
        <div className="card p-5 space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1">
              <div className="text-sm text-neutral-500">Signal</div>
              <div className="mt-1 text-xl font-semibold">{res.symbol} · {res.side?.toUpperCase?.()}</div>
              <div className="text-sm">
                size suggestion <b>{(+(res.size ?? 0)).toFixed(2)}</b> · <span className="badge">{res.reason}</span> ·{" "}
                <span className={"badge " + (above ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-700")}>
                  {above ? "Price above 50-SMA" : "Price ≤ 50-SMA"}
                </span>
              </div>
            </div>
            <div className="shrink-0 border border-neutral-200 rounded-xl p-4 text-center">
              <div className="text-xs text-neutral-500">GWX Score</div>
              <div className="text-3xl font-semibold" style={{color: score>12 ? "var(--gwx-green)" : score<-12 ? "#b91c1c" : "#475569"}}>{Math.round(score)}</div>
              <div className="text-xs text-neutral-500">−100 … +100</div>
            </div>
          </div>

          <div className="border border-neutral-200 rounded-xl p-3">
            <div className="text-xs text-neutral-500 mb-2">Trade rule</div>
            <div className="flex flex-wrap items-center gap-3">
              <input className="w-40" type="range" min="5" max="30" step="1" value={minScore} onChange={e=>setMinScore(parseInt(e.target.value))} title="Only trade if |Score| ≥ this value"/>
              <span className="text-sm">Only trade if |GWX Score| ≥ <b>{minScore}</b></span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="border border-neutral-200 rounded-xl p-3" title="Strength on a 0–100 scale">
              <div className="text-xs text-neutral-500">RSI (0–100)</div>
              <div className="text-lg font-semibold">{res.rsi == null ? "—" : res.rsi.toFixed(2)}</div>
            </div>
            <div className="border border-neutral-200 rounded-xl p-3" title="Average price of last ~50 candles">
              <div className="text-xs text-neutral-500">50-SMA</div>
              <div className="text-lg font-semibold">{res.sma == null ? "—" : res.sma.toFixed(5)}</div>
            </div>
            <div className="border border-neutral-200 rounded-xl p-3" title="Most recent closing price">
              <div className="text-xs text-neutral-500">Last price</div>
              <div className="text-lg font-semibold">{res.price == null ? "—" : res.price.toFixed(5)}</div>
            </div>
          </div>

          {/* Risk Simulator */}
          <div className="border border-neutral-200 rounded-xl p-4">
            <div className="text-sm font-medium mb-2">Risk Simulator</div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="border border-neutral-200 rounded-xl p-3">
                <div className="text-xs text-neutral-500">Risk per trade (£)</div>
                <div className="text-lg font-semibold">£{riskAmount.toFixed(2)}</div>
              </div>
              <div className="border border-neutral-200 rounded-xl p-3">
                <div className="text-xs text-neutral-500">Potential win (£)</div>
                <div className="text-lg font-semibold">£{potentialWin.toFixed(2)}</div>
              </div>
              <div className="border border-neutral-200 rounded-xl p-3">
                <div className="text-xs text-neutral-500">Breakeven win-rate</div>
                <div className="text-lg font-semibold">{breakevenWR.toFixed(1)}%</div>
              </div>
              <div className="border border-neutral-200 rounded-xl p-3">
                <div className="text-xs text-neutral-500">Your win-rate (assumed)</div>
                <div className="text-lg font-semibold">{assumedWinRate}%</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 items-center mt-3">
              <span className="text-sm">Assumed win-rate</span>
              <input className="w-40" type="range" min="20" max="70" step="1" value={assumedWinRate} onChange={e=>setAssumedWinRate(parseInt(e.target.value))} />
              <span className="text-sm">Trades to simulate</span>
              <input className="w-40" type="range" min="10" max="50" step="1" value={numTrades} onChange={e=>setNumTrades(parseInt(e.target.value))} />
            </div>
            <div className="text-xs text-neutral-500 mt-2">
              Over <b>{mcSummary.n}</b> trades: 10% worst ≈ £{mcSummary.p10.toFixed(0)}, median ≈ £{mcSummary.p50.toFixed(0)}, 10% best ≈ £{mcSummary.p90.toFixed(0)}.
            </div>
          </div>

          <div className="mt-1 border-t border-neutral-200 pt-4">
            <div className="text-sm text-neutral-500 mb-2">Order proposal</div>
            <div className="flex flex-wrap gap-2 items-center">
              <input className="border border-neutral-300 rounded-xl px-3 py-2 w-36" type="number" step="0.1" value={riskPct} onChange={e=>setRiskPct(parseFloat(e.target.value))} title="How much of your account you’re willing to lose if the stop is hit"/>
              <span className="text-sm">Risk per trade (%)</span>
              <input className="border border-neutral-300 rounded-xl px-3 py-2 w-40" type="number" step="100" value={equity} onChange={e=>setEquity(parseFloat(e.target.value))} title="Your account balance in £"/>
              <span className="text-sm">Account size (£)</span>
              <input className="border border-neutral-300 rounded-xl px-3 py-2 w-36" type="number" step="0.1" value={atrMult} onChange={e=>setAtrMult(parseFloat(e.target.value))} title="How far the stop is from entry, measured in ATR (volatility)"/>
              <span className="text-sm">Stop distance (ATR×)</span>
              <input className="border border-neutral-300 rounded-xl px-3 py-2 w-36" type="number" step="0.1" value={tpR} onChange={e=>setTpR(parseFloat(e.target.value))} title="Take-profit measured in R (risk units)"/>
              <span className="text-sm">Take-profit (R)</span>
              <button className="btn" onClick={propose} title="Calculate entry, stop and take-profit based on your settings">Propose Order</button>
            </div>
            {orderErr && <div className="text-red-600 mt-2">{orderErr}</div>}
            {order && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <div className="border border-neutral-200 rounded-xl p-3"><div className="text-xs text-neutral-500">Entry</div><div className="text-lg font-semibold">{order.entry.toFixed(5)}</div></div>
                <div className="border border-neutral-200 rounded-xl p-3"><div className="text-xs text-neutral-500">Stop-loss</div><div className="text-lg font-semibold">{order.stop.toFixed(5)}</div></div>
                <div className="border border-neutral-200 rounded-xl p-3"><div className="text-xs text-neutral-500">Take-profit</div><div className="text-lg font-semibold">{order.take_profit.toFixed(5)}</div></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
