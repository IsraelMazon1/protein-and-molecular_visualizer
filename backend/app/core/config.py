from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    app_name: str = "MolecularAI API"
    app_env: str = "development"
    backend_port: int = 8000
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    gemini_embedding_model: str = "gemini-embedding-001"

    mongodb_uri: str = ""
    mongodb_db_name: str = "molecularai"
    mongodb_collection: str = "structures"
    mongodb_suggestions_collection: str = "search_suggestions"
    mongodb_vector_index: str = "embedding_vector_index"
    suggestions_ttl_seconds: int = 86400

    vultr_host: str = ""
    vultr_user: str = "root"
    vultr_app_dir: str = "/opt/molecularai"

    model_config = SettingsConfigDict(
        env_file=ROOT_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
