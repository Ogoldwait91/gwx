import { recent } from "@/lib/api";

function Stat({label,value,sub}:{label:string;value:string;sub?:string}){
  return (
    <div className="card p-5">
      <div className="text-sm text-neutral-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-neutral-500 mt-1">{sub}</div>}
    </div>
  );
}

export default async function Page(){
  const data = await recent(8);
  return (
    <div className="container-narrow space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-neutral-500">Overview of signals and recent decisions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="Signals today" value={(data.items?.length ?? 0).toString()} sub="Decisions inserted to SQLite"/>
        <Stat label="Risk mode" value="Conservative" sub="0.5x size cap" />
        <Stat label="Data source" value="Manual / CSV" sub="Live feed TBD" />
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">Recent decisions</h2>
          <a className="btn" href="/history">View all</a>
        </div>
        <div className="divide-y">
          {(data.items ?? []).map((d:any,i:number)=>(
            <div key={i} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{d.symbol} · {d.side.toUpperCase()} <span className="badge ml-2">{d.reason}</span></div>
                <div className="text-xs text-neutral-500">ts: {d.ts}</div>
              </div>
              <div className="text-sm">size {(+d.size).toFixed(2)}</div>
            </div>
          ))}
          {(!data.items || data.items.length===0) && <div className="py-4 text-neutral-500">No decisions yet.</div>}
        </div>
      </div>
    </div>
  )
}
