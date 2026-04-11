# How to Build a Config Version History with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Configuration, Version History, Audit, Backend

Description: Track every configuration change in Redis using streams as an immutable append-only log, enabling full audit history and one-command rollback to any prior state.

---

Knowing what changed, who changed it, and when is critical when debugging production incidents. Redis Streams give you an append-only, ordered log of every config change that also supports rollback.

## Recording Changes in a Stream

Every time a config value is updated, append an event to a stream:

```python
import redis
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

HISTORY_STREAM = "config:history"

def update_config(service: str, key: str, new_value: str, changed_by: str):
    config_key = f"config:{service}"
    old_value = r.hget(config_key, key)

    r.hset(config_key, key, new_value)

    r.xadd(HISTORY_STREAM, {
        "service": service,
        "key": key,
        "old_value": old_value or "",
        "new_value": new_value,
        "changed_by": changed_by,
        "timestamp": str(time.time()),
    })
```

## Querying Change History

Fetch all changes for a specific service using `XREAD` or range queries:

```python
def get_history(service: str, count: int = 50) -> list:
    all_events = r.xrevrange(HISTORY_STREAM, count=count)
    return [
        fields for _, fields in all_events
        if fields.get("service") == service
    ]
```

For high-volume systems, use a per-service stream instead of a single global stream:

```python
def update_config_v2(service: str, key: str, new_value: str, changed_by: str):
    config_key = f"config:{service}"
    stream_key = f"config:history:{service}"
    old_value = r.hget(config_key, key) or ""

    pipe = r.pipeline()
    pipe.hset(config_key, key, new_value)
    pipe.xadd(stream_key, {
        "key": key,
        "old_value": old_value,
        "new_value": new_value,
        "changed_by": changed_by,
    })
    pipe.execute()
```

## Rolling Back to a Previous Value

Walk the history backwards and reapply the last known good value:

```python
def rollback_config(service: str, key: str, steps: int = 1):
    stream_key = f"config:history:{service}"
    events = r.xrevrange(stream_key)
    key_changes = [(eid, f) for eid, f in events if f.get("key") == key]

    if len(key_changes) < steps:
        raise ValueError("Not enough history to rollback")

    target_event_id, target_fields = key_changes[steps - 1]
    previous_value = target_fields["old_value"]
    r.hset(f"config:{service}", key, previous_value)
    return previous_value
```

## Capping History Length

Use stream trimming to prevent unbounded growth:

```bash
# Keep only the last 10,000 events
XTRIM config:history MAXLEN ~ 10000
```

Or trim automatically on each write:

```python
r.xadd(stream_key, fields, maxlen=10000, approximate=True)
```

## Summary

Redis Streams serve as an immutable, ordered audit log for configuration changes. Per-service streams keep history readable and easily queryable. Stream trimming caps memory usage. Rollback is a matter of looking up a previous value in the history and writing it back to the config hash.

