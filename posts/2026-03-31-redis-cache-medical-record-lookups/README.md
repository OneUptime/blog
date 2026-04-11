# How to Cache Medical Record Lookups with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Healthcare, Cache

Description: Speed up medical record lookups using Redis as a read-through cache with strict TTLs, access logging, and patient-level cache invalidation for compliance.

---

Electronic Health Record (EHR) systems face heavy read loads during clinical hours. The same patient records get fetched repeatedly by nurses, physicians, and billing staff. Caching these lookups in Redis can dramatically reduce database load while keeping access fast - but healthcare caching requires careful TTL management and audit logging.

## Design Considerations

- **Short TTLs**: Medical records can change (new labs, updated medications). Use TTLs of 5-15 minutes.
- **Audit logging**: Every cache read must be logged to satisfy HIPAA access requirements.
- **Immediate invalidation**: When a record is updated, the cache must be purged instantly.
- **Encryption**: Enable Redis TLS for encryption in transit and consider field-level encryption for sensitive data at rest.

## Setup

```python
import redis
import json
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True, ssl=True)

RECORD_PREFIX = "emr:patient"
CACHE_TTL = 600          # 10 minutes
ACCESS_LOG_STREAM = "emr:access_log"
```

## Read-Through Cache Pattern

```python
def get_patient_record(patient_id: str, requester_id: str, requester_role: str) -> dict | None:
    cache_key = f"{RECORD_PREFIX}:{patient_id}"

    # Log every access attempt regardless of cache hit/miss
    r.xadd(ACCESS_LOG_STREAM, {
        "patient_id": patient_id,
        "requester_id": requester_id,
        "requester_role": requester_role,
        "ts": int(time.time()),
        "source": "cache_lookup"
    })

    cached = r.get(cache_key)
    if cached:
        r.xadd(ACCESS_LOG_STREAM, {
            "patient_id": patient_id,
            "requester_id": requester_id,
            "result": "cache_hit",
            "ts": int(time.time())
        })
        return json.loads(cached)

    # Cache miss - fetch from database
    record = fetch_from_database(patient_id)
    if record:
        r.setex(cache_key, CACHE_TTL, json.dumps(record))
        r.xadd(ACCESS_LOG_STREAM, {
            "patient_id": patient_id,
            "requester_id": requester_id,
            "result": "cache_miss",
            "ts": int(time.time())
        })

    return record

def fetch_from_database(patient_id: str) -> dict | None:
    # Replace with actual DB query
    return {
        "patient_id": patient_id,
        "name": "Jane Doe",
        "dob": "1985-03-15",
        "allergies": ["penicillin"],
        "conditions": ["hypertension", "type2_diabetes"],
        "last_updated": int(time.time()) - 3600
    }
```

## Cache Invalidation on Record Update

```python
def update_patient_record(patient_id: str, updates: dict, updater_id: str) -> dict:
    # Perform the actual DB update first
    updated_record = write_to_database(patient_id, updates)

    # Immediately invalidate the cache
    cache_key = f"{RECORD_PREFIX}:{patient_id}"
    r.delete(cache_key)

    # Log the update
    r.xadd(ACCESS_LOG_STREAM, {
        "patient_id": patient_id,
        "requester_id": updater_id,
        "action": "record_updated",
        "fields_changed": json.dumps(list(updates.keys())),
        "ts": int(time.time())
    })

    return updated_record

def write_to_database(patient_id: str, updates: dict) -> dict:
    # Replace with actual DB write
    return {"patient_id": patient_id, **updates, "last_updated": int(time.time())}
```

## Bulk Patient Lookups

For ward rounds where staff look up many patients at once:

```python
def get_patient_records_bulk(patient_ids: list[str], requester_id: str) -> dict:
    keys = [f"{RECORD_PREFIX}:{pid}" for pid in patient_ids]
    cached_values = r.mget(keys)

    results = {}
    miss_ids = []

    for pid, val in zip(patient_ids, cached_values):
        if val:
            results[pid] = json.loads(val)
        else:
            miss_ids.append(pid)

    if miss_ids:
        pipe = r.pipeline()
        for pid in miss_ids:
            record = fetch_from_database(pid)
            if record:
                results[pid] = record
                pipe.setex(f"{RECORD_PREFIX}:{pid}", CACHE_TTL, json.dumps(record))
        pipe.execute()

    return results
```

## Monitoring Cache Performance

```bash
redis-cli info stats | grep -E "keyspace_hits|keyspace_misses"
redis-cli info memory | grep used_memory_human
```

## Summary

Caching medical record lookups in Redis with a read-through pattern reduces EHR database load during peak clinical hours. Key safety measures include short TTLs to prevent stale record access, immediate cache invalidation on updates, and streaming every access event to a Redis Stream for HIPAA-compliant audit logs.
