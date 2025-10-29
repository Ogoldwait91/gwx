export default function Topbar(){
  return (
    <header className="w-full sticky top-0 z-10 bg-ink-50/70 backdrop-blur border-b border-ink-100">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="text-sm text-ink-500">Secure • Paper Trading</div>
        <div className="flex items-center gap-3">
          <span className="badge">EURUSD</span>
          <span className="badge">15m</span>
        </div>
      </div>
    </header>
  );
}
