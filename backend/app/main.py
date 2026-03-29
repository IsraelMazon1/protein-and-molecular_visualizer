import os
from pathlib import Path

from dotenv import load_dotenv

# NOTE: Restart required after any .env changes - env vars are not hot-reloaded
ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=ENV_PATH, override=True)

print(f"[ENV] Loading from: {ENV_PATH}")
print(f"[ENV] Resolved path: {ENV_PATH.resolve()}")
print(f"[ENV] File exists: {ENV_PATH.exists()}")
print(f"[ENV] MONGODB_URI set: {bool(os.getenv('MONGODB_URI'))}")
print(f"[ENV] GEMINI_API_KEY set: {bool(os.getenv('GEMINI_API_KEY'))}")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.core.config import get_settings
from app.core.exceptions import MolecularAIError
from app.db.mongo import ping_database


settings = get_settings()
app = FastAPI(title=settings.app_name)


@app.on_event("startup")
async def validate_env():
    required = {
        "GEMINI_API_KEY": os.getenv("GEMINI_API_KEY"),
        "MONGODB_URI": os.getenv("MONGODB_URI"),
    }
    for key, value in required.items():
        status = "OK" if value else "MISSING"
        print(f"[STARTUP] {key}: {status}")

    try:
        ping_database()
        print("[MONGO] Successfully connected to MongoDB Atlas")
    except MolecularAIError as exc:
        print(f"[MONGO] Connection failed: {exc.message}")
    except Exception as exc:
        print(f"[MONGO] Connection failed: {exc}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(MolecularAIError)
async def molecular_ai_exception_handler(_: Request, exc: MolecularAIError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@app.get("/health")
def healthcheck():
    return {"status": "ok", "service": settings.app_name}


@app.get("/api/env/debug")
async def env_debug():
    mongodb_uri = os.getenv("MONGODB_URI")
    return {
        "mongodb_uri_set": bool(mongodb_uri),
        "mongodb_uri_prefix": mongodb_uri[:20] + "..." if mongodb_uri else None,
        "gemini_key_set": bool(os.getenv("GEMINI_API_KEY")),
    }


app.include_router(router)
