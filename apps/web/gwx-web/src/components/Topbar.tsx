"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Topbar(){
  const [ok, setOk] = useState<boolean | null>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  useEffect(()=>{
    let alive = true;
    (async ()=>{
      try{
        const r = await fetch(`${API_URL}/health`, { cache: "no-store" });
        if(!alive) return;
        setOk(r.ok);
      }catch{
        if(!alive) return;
        setOk(false);
      }
    })();
    return ()=>{ alive = false; }
  }, []);

  return (
    <div className="px-4 py-3 border-b border-neutral-200 flex items-center gap-3 bg-white sticky top-0 z-10">
      <Link href="/" className="flex items-center gap-2">
        <img src="/gwx-logo.svg" alt="GWX" width={140} height={28}/>
      </Link>
      <div className="ml-auto flex items-center gap-3">
        <div title={ok===null ? "Checking…" : ok ? "API healthy" : "API down"}
             className="w-2.5 h-2.5 rounded-full"
             style={{ background: ok===null ? "#cbd5e1" : ok ? "#0EA15F" : "#ef4444" }} />
      </div>
    </div>
  );
}
