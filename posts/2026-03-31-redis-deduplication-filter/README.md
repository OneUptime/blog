# How to Implement a Deduplication Filter with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Deduplication, Filter

Description: Build a deduplication filter with Redis using SET NX and Bloom filter-like patterns to prevent processing duplicate events, messages, or API requests.

---

Duplicate events are everywhere: webhooks retry on failure, users double-click submit buttons, message queues redeliver on timeout. A deduplication filter is the gatekeeper that ensures each unique event is processed exactly once.

## Basic Deduplication with SET NX

The simplest approach: store the event ID with a TTL. SET NX returns True only if the key was newly created:

```python
import redis
import hashlib

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def is_duplicate(event_id: str, ttl_seconds: int = 3600) -> bool:
    """Returns True if this event has been seen before."""
    key = f"dedup:{event_id}"
    # SET NX: only sets if key doesn't exist
    is_new = r.set(key, 1, ex=ttl_seconds, nx=True)
    return not is_new  # If is_new is None (key existed), it's a duplicate

def process_once(event_id: str, handler, ttl_seconds: int = 3600) -> bool:
    """Process an event only if it hasn't been seen. Returns True if processed."""
    if is_duplicate(event_id, ttl_seconds):
        return False
    handler()
    return True
```

## Content-Based Deduplication

When events don't have unique IDs, hash the content:

```python
import json

def content_hash(payload: dict) -> str:
    """Create a deterministic hash of the event content."""
    canonical = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(canonical.encode()).hexdigest()[:16]

def is_duplicate_by_content(payload: dict, ttl_seconds: int = 3600) -> bool:
    event_id = content_hash(payload)
    return is_duplicate(event_id, ttl_seconds)
```

## Webhook Deduplication

Webhook providers like Stripe or GitHub include an event ID in headers. Use it directly:

```python
def handle_webhook(event_id: str, event_type: str, payload: dict) -> dict:
    if is_duplicate(f"webhook:{event_id}", ttl_seconds=86400):
        return {"status": "duplicate", "event_id": event_id}

    # Process the webhook
    process_event(event_type, payload)
    return {"status": "processed", "event_id": event_id}

def process_event(event_type: str, payload: dict):
    print(f"Processing {event_type}: {payload}")
```

## Idempotent API Request Deduplication

Use an idempotency key provided by the client to deduplicate API requests:

```python
def idempotent_api_call(idempotency_key: str, operation, ttl_seconds: int = 86400) -> dict:
    result_key = f"idempotent:result:{idempotency_key}"
    seen_key = f"idempotent:seen:{idempotency_key}"

    # Return cached result if already processed
    cached = r.get(result_key)
    if cached:
        import json
        return {"status": "cached", "result": json.loads(cached)}

    # Try to claim this operation
    claimed = r.set(seen_key, 1, ex=ttl_seconds, nx=True)
    if not claimed:
        # Another process is handling it - wait briefly and retry
        import time
        time.sleep(0.1)
        cached = r.get(result_key)
        if cached:
            import json
            return {"status": "cached", "result": json.loads(cached)}
        return {"status": "in_progress"}

    # Execute and cache the result
    result = operation()
    import json
    r.setex(result_key, ttl_seconds, json.dumps(result))
    return {"status": "processed", "result": result}
```

## Message Queue Deduplication

For message queue consumers, deduplicate by message ID before processing:

```python
def consume_message(message_id: str, message_body: dict,
                     processor, dedup_window: int = 3600) -> bool:
    key = f"mq:dedup:{message_id}"
    if r.set(key, 1, ex=dedup_window, nx=True):
        processor(message_body)
        return True
    return False  # Duplicate - skip
```

## Deduplication Stats

```python
def get_dedup_stats(namespace: str = "dedup") -> dict:
    # Count active deduplication keys (approximate)
    # Note: Use SCAN in production, not KEYS
    count = 0
    cursor = 0
    while True:
        cursor, keys = r.scan(cursor, match=f"{namespace}:*", count=100)
        count += len(keys)
        if cursor == 0:
            break
    return {"active_dedup_entries": count}
```

## Summary

Redis SET NX with TTL is the most efficient deduplication primitive available - it atomically checks and records seen events in a single command. Content hashing enables deduplication for events without IDs, and caching the result of idempotent operations provides full at-most-once processing semantics for API clients.
