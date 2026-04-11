# How to Build a Draft/Published Content Manager with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, CMS, Draft, Published, Content Management

Description: Build a draft and published content manager with Redis hashes and sets that tracks content lifecycle states, supports preview links, and enables instant publish toggling.

---

A content management system needs to track which articles are in draft versus published, allow editors to preview drafts before going live, and publish instantly. Redis hashes and sets handle this with O(1) state transitions.

## Data Model

Use a hash per content item to store its state and metadata, and sets to index content by state:

```python
import redis
import time
import secrets

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def create_draft(content_id: str, title: str, body: str, author: str):
    pipe = r.pipeline()
    pipe.hset(f"content:{content_id}", mapping={
        "title": title,
        "body": body,
        "author": author,
        "status": "draft",
        "created_at": str(time.time()),
        "updated_at": str(time.time()),
    })
    pipe.sadd("content:drafts", content_id)
    pipe.execute()
```

## Updating a Draft

```python
def update_draft(content_id: str, title: str, body: str):
    status = r.hget(f"content:{content_id}", "status")
    if status not in ("draft", "scheduled"):
        raise ValueError(f"Cannot edit content with status: {status}")
    r.hset(f"content:{content_id}", mapping={
        "title": title,
        "body": body,
        "updated_at": str(time.time()),
    })
```

## Publishing Content

Atomically move content from draft to published state:

```python
def publish(content_id: str, published_by: str):
    pipe = r.pipeline()
    pipe.hset(f"content:{content_id}", mapping={
        "status": "published",
        "published_at": str(time.time()),
        "published_by": published_by,
    })
    pipe.srem("content:drafts", content_id)
    pipe.sadd("content:published", content_id)
    pipe.execute()
```

## Unpublishing (Reverting to Draft)

```python
def unpublish(content_id: str):
    pipe = r.pipeline()
    pipe.hset(f"content:{content_id}", mapping={
        "status": "draft",
        "updated_at": str(time.time()),
    })
    pipe.srem("content:published", content_id)
    pipe.sadd("content:drafts", content_id)
    pipe.execute()
```

## Secure Preview Links for Drafts

Generate a time-limited preview token for editors to share drafts:

```python
def create_preview_token(content_id: str, ttl: int = 3600) -> str:
    token = secrets.token_urlsafe(32)
    r.setex(f"preview:token:{token}", ttl, content_id)
    return token

def get_draft_for_preview(token: str) -> dict:
    content_id = r.get(f"preview:token:{token}")
    if not content_id:
        return None
    return r.hgetall(f"content:{content_id}")
```

## Listing Drafts and Published Content

```python
def list_drafts() -> list:
    ids = r.smembers("content:drafts")
    return [r.hgetall(f"content:{cid}") for cid in ids]

def list_published() -> list:
    ids = r.smembers("content:published")
    return [r.hgetall(f"content:{cid}") for cid in ids]
```

## Summary

Redis hashes store content state atomically while sets provide O(1) membership checks and listings for each content state. Pipelines ensure publish and unpublish transitions update both the hash and index sets atomically. Time-limited preview tokens let editors share drafts securely without exposing the content publicly.

