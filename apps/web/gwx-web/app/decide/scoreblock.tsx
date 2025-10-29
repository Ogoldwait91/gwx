<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
  <div className="border border-neutral-200 rounded-xl p-3">
    <div className="text-xs text-neutral-500">Technical GWX Score</div>
    <div className="text-lg font-semibold">{res.score == null ? "—" : Math.round(res.score)}</div>
  </div>
  <div className="border border-neutral-200 rounded-xl p-3">
    <div className="text-xs text-neutral-500">News Score (24h)</div>
    <div className="text-lg font-semibold">{res.news_score == null ? "—" : Math.round(res.news_score)}</div>
  </div>
  <div className="border border-neutral-200 rounded-xl p-3">
    <div className="text-xs text-neutral-500">Combined Score</div>
    <div className="text-lg font-semibold">{res.combined_score == null ? "—" : Math.round(res.combined_score)}</div>
  </div>
</div>

{(res.news_headlines?.length ?? 0) > 0 && (
  <div className="border border-neutral-200 rounded-xl p-3 mt-3">
    <div className="text-xs text-neutral-500 mb-1">Top headlines affecting {res.symbol}</div>
    <ul className="list-disc pl-5 text-sm">
      {res.news_headlines.slice(0,6).map((h:string,i:number)=>(<li key={i}>{h}</li>))}
    </ul>
  </div>
)}
