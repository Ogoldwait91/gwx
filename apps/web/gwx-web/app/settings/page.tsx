"use client";
import { useEffect, useState } from "react";

export default function SettingsPage(){
  const [equity, setEquity] = useState(10000);
  const [mode, setMode] = useState("Balanced");

  useEffect(()=>{
    try{
      const s = JSON.parse(localStorage.getItem("gwx_user") || "{}");
      if(typeof s.equity === "number") setEquity(s.equity);
      if(typeof s.mode === "string") setMode(s.mode);
    }catch{}
  },[]);

  function save(){
    const newData = { equity, mode };
    localStorage.setItem("gwx_user", JSON.stringify(newData));
    // broadcast so Topbar/Dashboard update live
    window.dispatchEvent(new Event("gwx-user-update"));
    alert("Saved");
  }

  return (
    <div className="container-narrow space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <label className="w-40 text-sm text-neutral-600">Account Equity (£)</label>
          <input
            type="number" step="100"
            className="border border-neutral-300 rounded-xl px-3 py-2"
            value={equity}
            onChange={e=>setEquity(parseFloat(e.target.value)||0)}
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="w-40 text-sm text-neutral-600">Risk Mode</label>
          <select
            className="border border-neutral-300 rounded-xl px-3 py-2"
            value={mode}
            onChange={e=>setMode(e.target.value)}
          >
            <option>Aggressive</option>
            <option>Balanced</option>
            <option>Conservative</option>
          </select>
        </div>
        <button className="btn-primary" onClick={save}>Save</button>
      </div>
    </div>
  );
}
