# How to Implement Distributed Locks with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Distributed Lock, Concurrency, Mutex, TTL

Description: Learn how to implement distributed locks in MongoDB using TTL indexes and findOneAndUpdate to coordinate exclusive access across multiple processes.

---

## What Is a Distributed Lock?

A distributed lock ensures that only one process at a time can execute a critical section across multiple machines or processes. Unlike an in-process mutex, a distributed lock must be stored in a shared data store that all processes can access and is durable across process restarts.

MongoDB is a practical choice for distributed locks in systems that already use it - no extra infrastructure needed.

## The Lock Document Schema

```javascript
{
  "_id": "my-lock-name",
  "holder": "process-id-or-hostname",
  "acquiredAt": ISODate("2026-03-31T10:00:00Z"),
  "expiresAt": ISODate("2026-03-31T10:01:00Z")
}
```

## Setting Up the TTL Index

Create a TTL index on `expiresAt` so MongoDB automatically removes stale locks:

```javascript
db.locks.createIndex(
  { "expiresAt": 1 },
  { expireAfterSeconds: 0 }
)
```

With `expireAfterSeconds: 0`, documents are deleted when `expiresAt` passes. This ensures no lock is held indefinitely if the holder crashes.

## Acquiring the Lock

```python
from pymongo import MongoClient, ReturnDocument
from pymongo.errors import DuplicateKeyError
from datetime import datetime, timedelta, timezone
import uuid

client = MongoClient("mongodb://localhost:27017/")
db = client.myDatabase

def acquire_lock(lock_name: str, ttl_seconds: int = 60) -> str | None:
    holder_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=ttl_seconds)

    try:
        result = db.locks.find_one_and_update(
            {
                "_id": lock_name,
                "expiresAt": {"$lt": now}  # lock expired
            },
            {
                "$set": {
                    "holder": holder_id,
                    "acquiredAt": now,
                    "expiresAt": expires_at
                }
            },
            upsert=True,
            return_document=ReturnDocument.AFTER
        )
    except DuplicateKeyError:
        # Lock is currently held by another process
        return None

    if result and result.get("holder") == holder_id:
        return holder_id
    return None
```

## Releasing the Lock

Only the process that holds the lock can release it, verified by the `holder_id`:

```python
def release_lock(lock_name: str, holder_id: str) -> bool:
    result = db.locks.delete_one(
        {"_id": lock_name, "holder": holder_id}
    )
    return result.deleted_count > 0
```

## Renewing the Lock

For long-running operations, extend the TTL before it expires:

```python
def renew_lock(lock_name: str, holder_id: str, ttl_seconds: int = 60) -> bool:
    now = datetime.now(timezone.utc)
    result = db.locks.update_one(
        {"_id": lock_name, "holder": holder_id},
        {"$set": {"expiresAt": now + timedelta(seconds=ttl_seconds)}}
    )
    return result.matched_count > 0
```

## Using the Lock with a Context Manager

```python
from contextlib import contextmanager
import time

@contextmanager
def distributed_lock(lock_name: str, ttl_seconds: int = 60, timeout: int = 30):
    holder_id = None
    deadline = time.time() + timeout

    while time.time() < deadline:
        holder_id = acquire_lock(lock_name, ttl_seconds)
        if holder_id:
            break
        time.sleep(0.5)

    if not holder_id:
        raise TimeoutError(f"Could not acquire lock '{lock_name}' within {timeout}s")

    try:
        yield holder_id
    finally:
        release_lock(lock_name, holder_id)

# Usage
with distributed_lock("payment-processor") as lock_id:
    process_payments()
```

## Handling Edge Cases

**Lock holder crash:** The TTL index automatically removes the expired lock document, allowing other processes to acquire it after the TTL passes.

**Clock skew:** Use server-side timestamps (`$$NOW` or `new Date()` in the update operator) rather than client-side `datetime.now()` for consistency across hosts.

**Duplicate key on upsert:** If two processes attempt the upsert simultaneously when no lock document exists, only one will win the insert because `_id` is unique. The other process receives a `DuplicateKeyError`, which the code catches and treats as a failed acquisition.

## Limitations

MongoDB distributed locks have eventual TTL cleanup (the TTL reaper runs approximately every 60 seconds). For hard real-time guarantees, consider a purpose-built solution like Redis Redlock. For most application workloads, MongoDB locks are sufficient.

## Summary

MongoDB distributed locks use a `locks` collection with a TTL index to ensure stale locks expire automatically. The acquire operation is a single atomic `findOneAndUpdate` with `upsert`, which prevents two processes from acquiring the same lock simultaneously. Use a context manager pattern for clean acquisition and release, and renew the lock during long-running operations to prevent accidental expiry.
