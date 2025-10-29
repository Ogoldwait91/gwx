@echo off
call .\.venv\Scripts\activate
python -m uvicorn main:app --reload --port 8000
