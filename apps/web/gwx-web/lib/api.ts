export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export type Decision = { ts:string; symbol:string; side:"long"|"short"|"flat"; reason:string; size:number };

export async function decide(body:any): Promise<Decision> {
  const res = await fetch(`${API_URL}/signals/decide`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(body),
    cache: "no-store"
  });
  if(!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function decideCsv(symbol:string, csvText:string): Promise<Decision> {
  const res = await fetch(`${API_URL}/signals/decide/csv?symbol=${encodeURIComponent(symbol)}`, {
    method: "POST",
    headers: {"Content-Type":"text/plain"},
    body: csvText,
    cache: "no-store"
  });
  if(!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function recent(limit=20){
  const res = await fetch(`${API_URL}/decisions/recent?limit=${limit}`, { cache:"no-store" });
  if(!res.ok) return { items:[] };
  return res.json();
}
