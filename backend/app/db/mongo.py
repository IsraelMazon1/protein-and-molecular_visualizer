from datetime import datetime, timezone
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import certifi
from pymongo import MongoClient

from app.core.config import get_settings
from app.core.exceptions import MolecularAIError


settings = get_settings()
client: MongoClient | None = None


def _sanitize_mongodb_uri(uri: str) -> str:
    parts = urlsplit(uri)
    filtered_query = [
        (key, value)
        for key, value in parse_qsl(parts.query, keep_blank_values=True)
        if key.lower() not in {"tls", "tlsinsecure", "ssl", "authsource"}
    ]
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(filtered_query), parts.fragment))


def create_mongo_client(uri: str) -> MongoClient:
    return MongoClient(
        _sanitize_mongodb_uri(uri),
        tls=True,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=30000,
        connectTimeoutMS=20000,
        socketTimeoutMS=20000,
        retryWrites=True,
    )


def get_database():
    global client
    if not settings.mongodb_uri:
        raise MolecularAIError("MongoDB is not configured. Set MONGODB_URI in .env.", status_code=500)
    if client is None:
        client = create_mongo_client(settings.mongodb_uri)
    return client[settings.mongodb_db_name]


def get_collection():
    db = get_database()
    return db[settings.mongodb_collection]


def get_named_collection(name: str):
    db = get_database()
    return db[name]


def serialize_document(document: dict[str, Any]) -> dict[str, Any]:
    serialized = {**document}
    if "_id" in serialized:
        serialized["id"] = str(serialized.pop("_id"))
    created_at = serialized.get("created_at")
    if isinstance(created_at, datetime):
        serialized["created_at"] = created_at.astimezone(timezone.utc).isoformat()
    return serialized


def ping_database() -> None:
    database = get_database()
    database.client.admin.command("ping")
