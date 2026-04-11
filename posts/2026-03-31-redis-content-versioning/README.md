# How to Implement Content Versioning with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Content Versioning, Version Control, CMS, Backend

Description: Implement content versioning with Redis lists and hashes to track every revision of a document, compare versions, and restore prior content with a single command.

---

Content versioning lets editors recover from mistakes and see who changed what. Redis lists and hashes make it easy to store a revision history per document and restore any previous version instantly.

## Storing a New Revision

Each time content is saved, push a snapshot to the content's revision list and update the current version pointer:

```python
import redis
import json
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)
MAX_REVISIONS = 50

def save_revision(content_id: str, body: str, author: str) -> int:
    revision = {
        "body": body,
        "author": author,
        "saved_at": str(time.time()),
    }
    revision_key = f"content:{content_id}:revisions"

    pipe = r.pipeline()
    # Push to the front (latest first)
    pipe.lpush(revision_key, json.dumps(revision))
    # Cap history at MAX_REVISIONS
    pipe.ltrim(revision_key, 0, MAX_REVISIONS - 1)
    # Update current content hash
    pipe.hset(f"content:{content_id}", mapping={
        "body": body,
        "author": author,
        "updated_at": str(time.time()),
    })
    # Increment version counter atomically
    pipe.hincrby(f"content:{content_id}", "version", 1)
    pipe.execute()
    return r.llen(revision_key)
```

## Reading Revision History

Fetch the N most recent revisions:

```python
def get_revisions(content_id: str, limit: int = 10) -> list:
    raw_list = r.lrange(f"content:{content_id}:revisions", 0, limit - 1)
    revisions = []
    for i, raw in enumerate(raw_list):
        rev = json.loads(raw)
        rev["revision_index"] = i  # 0 = latest
        revisions.append(rev)
    return revisions
```

## Restoring a Previous Revision

Rolling back means re-saving an older revision as a new one (preserving history):

```python
def restore_revision(content_id: str, revision_index: int, restorer: str) -> bool:
    raw = r.lindex(f"content:{content_id}:revisions", revision_index)
    if not raw:
        return False
    revision = json.loads(raw)
    save_revision(content_id, revision["body"], restorer)
    return True
```

## Diffing Two Revisions

Compare two revisions to highlight changes:

```python
def diff_revisions(content_id: str, index_a: int, index_b: int) -> dict:
    raw_a = r.lindex(f"content:{content_id}:revisions", index_a)
    raw_b = r.lindex(f"content:{content_id}:revisions", index_b)
    if not raw_a or not raw_b:
        return {}
    rev_a = json.loads(raw_a)
    rev_b = json.loads(raw_b)
    return {
        "revision_a": {"index": index_a, "author": rev_a["author"], "body": rev_a["body"]},
        "revision_b": {"index": index_b, "author": rev_b["author"], "body": rev_b["body"]},
        "same": rev_a["body"] == rev_b["body"],
    }
```

## Monitoring Storage Usage

```bash
# Number of stored revisions for a piece of content
LLEN content:article-101:revisions

# Memory used by a key
MEMORY USAGE content:article-101:revisions
```

## Summary

Redis lists efficiently store revision history as a capped, ordered log with O(1) push and O(N) range reads. Saving a restoration as a new revision preserves full history and makes rollback just another write. Capping the list with `LTRIM` bounds memory usage while retaining the most recent and useful revisions.

