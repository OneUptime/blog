# How to Use Redis for Log Deduplication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Logging, Deduplication, Observability, Performance

Description: Deduplicate noisy log streams using Redis sets and bloom filters to reduce storage costs and alert fatigue.

---

High-traffic services can emit thousands of identical log lines per second - the same error repeated for every failed request. Shipping all of them to your log storage backend wastes money and buries signal in noise. Redis provides fast deduplication using sets, bloom filters, and expiring keys.

## Simple Set-Based Deduplication

For low-cardinality logs like startup messages or config warnings, use a Redis set with a TTL to deduplicate within a time window:

```python
import redis
import hashlib
import json

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def should_emit_log(log: dict, window_seconds: int = 60) -> bool:
    # Fingerprint the log by level, message, and source
    fingerprint = hashlib.sha256(
        json.dumps({
            "level": log.get("level"),
            "message": log.get("message"),
            "source": log.get("source"),
        }, sort_keys=True).encode()
    ).hexdigest()

    key = f"logdedup:{fingerprint}"
    is_new = r.set(key, "1", nx=True, ex=window_seconds)
    return bool(is_new)

def emit_if_unique(log: dict):
    if should_emit_log(log):
        send_to_log_backend(log)
```

## Counting Suppressed Duplicates

Instead of silently dropping duplicates, increment a counter and flush a summary periodically:

```python
def emit_with_count(log: dict, window_seconds: int = 60) -> bool:
    fingerprint = hashlib.sha256(
        json.dumps({k: log.get(k) for k in ("level", "message", "source")},
                   sort_keys=True).encode()
    ).hexdigest()

    count_key = f"logcount:{fingerprint}"
    first_key = f"logfirst:{fingerprint}"

    count = r.incr(count_key)
    r.expire(count_key, window_seconds)

    if count == 1:
        r.setex(first_key, window_seconds, json.dumps(log))
        send_to_log_backend(log)
        return True

    # Emit a summary at count thresholds
    if count in (10, 100, 1000):
        summary = dict(log)
        summary["message"] = f"[x{count}] {log['message']}"
        send_to_log_backend(summary)

    return False
```

## Bloom Filter for High-Cardinality Deduplication

When log volume is very high, a bloom filter uses far less memory than a full set. Use the RedisBloom module:

```python
bf = r.bf()

def dedup_with_bloom(log: dict, filter_name: str = "logbloom") -> bool:
    fingerprint = hashlib.sha256(
        json.dumps({"msg": log.get("message"), "src": log.get("source")},
                   sort_keys=True).encode()
    ).hexdigest()

    try:
        bf.create(filter_name, errorRate=0.001, capacity=1000000)
    except Exception:
        pass  # already exists

    is_new = bf.add(filter_name, fingerprint)
    return bool(is_new)
```

## Flushing Deduplication Windows

Reset deduplication windows on a schedule to ensure new occurrences of recurring errors are still logged:

```bash
# Clear all deduplication keys for a fresh window
redis-cli --scan --pattern "logdedup:*" | xargs redis-cli del

# Or rely on TTL - keys auto-expire after window_seconds
redis-cli ttl logdedup:abc123
```

## Summary

Redis enables efficient log deduplication using set membership tests, expiring keys, and bloom filters. Counting suppressed duplicates instead of silently dropping them preserves visibility into error frequency. Bloom filters handle high-cardinality streams with minimal memory overhead, making Redis a practical layer between your services and log storage.
