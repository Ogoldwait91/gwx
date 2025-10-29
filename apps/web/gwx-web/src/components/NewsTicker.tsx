"use client";
import { useEffect, useState } from "react";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const FALLBACK = [
  "Global risk sentiment steady ahead of central bank decisions",
  "Oil slips; focus shifts to inflation data and payrolls",
  "Dollar mixed as traders weigh growth and rate path",
  "Gold holds range amid cautious risk tone",
];

export default function NewsTicker() {
  const [headlines, setHeadlines] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<"ok"|"offline"|"loading">("loading");

  async function fetchHeadlines() {
    try {
      const res = await fetch(`${API_URL}/news/score?symbol=US500&hours=6`, { cache: "no-store" });
      if (!res.ok) throw new Error("bad status");
      const j = await res.json();
      const list = (j.headlines || []).filter(Boolean);
      if (list.length === 0) throw new Error("no headlines");
      setHeadlines(list);
      setStatus("ok");
    } catch {
      setHeadlines(FALLBACK);
      setStatus("offline");
    }
  }

  useEffect(() => {
    fetchHeadlines();
    const intv = setInterval(fetchHeadlines, 60000);
    return () => clearInterval(intv);
  }, []);

  useEffect(() => {
    if (!headlines.length) return;
    const rot = setInterval(() => setIndex(i => (i + 1) % headlines.length), 5000);
    return () => clearInterval(rot);
  }, [headlines]);

  const note = status === "offline" ? " (live feed unavailable)" : "";

  return (
    <div className="card p-3 mb-4 bg-emerald-50 border-emerald-100 text-emerald-800 overflow-hidden">
      <div className="flex items-center gap-3">
        <span className="font-semibold">Market Headlines{note}:</span>
        <span className="animate-fade-in text-sm">{headlines[index]}</span>
      </div>
    </div>
  );
}
