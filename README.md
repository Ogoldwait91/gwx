# GWX - Goldwait Exchange

Institutional-style, event-driven signal engine.

## Structure
- apps/api - FastAPI backend, SQLite persistence.
- apps/web/gwx-web - Next.js dashboard.
- packages/gde - Goldwait Decision Engine (surprise -> mapping -> regime -> playbook -> sizing).

## Dev run
1) API:
   cd apps/api
   .\.venv\Scripts\Activate.ps1
   python -m uvicorn main:app --reload --port 8000

2) Web:
   cd apps/web/gwx-web
   npm run dev

Open http://127.0.0.1:8000/health and http://localhost:3000.
