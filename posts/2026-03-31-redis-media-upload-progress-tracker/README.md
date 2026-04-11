# How to Build a Media Upload Progress Tracker with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Upload, Progress, WebSocket, Backend

Description: Track large media upload progress in real time with Redis hashes updated by upload workers and streamed to clients via Server-Sent Events or WebSocket connections.

---

Large file uploads can take minutes. Without progress feedback, users abandon uploads. A Redis-backed progress tracker lets upload workers write progress in real time while frontend clients poll or subscribe for updates.

## Initializing an Upload Session

When a client initiates an upload, create a progress record in Redis with a TTL:

```python
import redis
import uuid
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)
UPLOAD_TTL = 3600  # 1 hour

def create_upload_session(filename: str, total_bytes: int, user_id: int) -> str:
    upload_id = str(uuid.uuid4())
    key = f"upload:{upload_id}"
    r.hset(key, mapping={
        "upload_id": upload_id,
        "filename": filename,
        "total_bytes": str(total_bytes),
        "uploaded_bytes": "0",
        "status": "pending",
        "user_id": str(user_id),
        "created_at": str(time.time()),
    })
    r.expire(key, UPLOAD_TTL)
    return upload_id
```

## Updating Progress During Upload

The upload worker updates progress as chunks are received:

```python
def update_progress(upload_id: str, uploaded_bytes: int):
    key = f"upload:{upload_id}"
    pipe = r.pipeline()
    pipe.hset(key, "uploaded_bytes", str(uploaded_bytes))
    pipe.hset(key, "status", "uploading")
    pipe.hset(key, "updated_at", str(time.time()))
    pipe.execute()

def complete_upload(upload_id: str, file_url: str):
    key = f"upload:{upload_id}"
    total = int(r.hget(key, "total_bytes") or 0)
    r.hset(key, mapping={
        "uploaded_bytes": str(total),
        "status": "complete",
        "file_url": file_url,
        "completed_at": str(time.time()),
    })

def fail_upload(upload_id: str, error: str):
    r.hset(f"upload:{upload_id}", mapping={
        "status": "failed",
        "error": error,
    })
```

## Reading Progress for the Client

```python
def get_progress(upload_id: str) -> dict:
    data = r.hgetall(f"upload:{upload_id}")
    if not data:
        return {"status": "not_found"}
    total = int(data.get("total_bytes", 1))
    uploaded = int(data.get("uploaded_bytes", 0))
    data["percent"] = round(uploaded / total * 100, 1) if total > 0 else 0
    return data
```

## Streaming Progress via Server-Sent Events

```python
import json
from flask import Flask, Response, stream_with_context
import time

app = Flask(__name__)

@app.get("/upload/<upload_id>/progress")
def stream_progress(upload_id):
    def event_stream():
        while True:
            progress = get_progress(upload_id)
            yield f"data: {json.dumps(progress)}\n\n"
            if progress.get("status") in ("complete", "failed", "not_found"):
                break
            time.sleep(1)
    return Response(stream_with_context(event_stream()), mimetype="text/event-stream")
```

## Listing Active Uploads for a User

```bash
# Scan for active uploads - use sparingly in production
SCAN 0 MATCH "upload:*" COUNT 100
```

```python
def get_user_uploads(user_id: int) -> list:
    # In production, maintain a set per user
    upload_ids = r.smembers(f"user:{user_id}:uploads")
    return [get_progress(uid) for uid in upload_ids]
```

## Summary

Redis hashes provide a lightweight, TTL-bounded upload session store that upload workers update in real time. Server-Sent Events or WebSocket connections give clients a live progress feed with one-second resolution. The TTL on upload sessions prevents orphaned records from consuming memory after uploads complete or expire.

