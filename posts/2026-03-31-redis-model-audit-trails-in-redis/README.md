# How to Model Audit Trails in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Audit Trail, Compliance, Stream, Event Logging, Data Modeling

Description: Model audit trails in Redis using Streams to capture tamper-evident, ordered event logs for user actions, system changes, and compliance requirements.

---

## Why Use Redis for Audit Trails

Audit trails must be ordered, append-only, and fast to write. Redis Streams provide all three properties: each entry gets a monotonically increasing ID, entries cannot be modified after insertion, and writes are O(1). Redis is ideal as an audit buffer that feeds a durable store like PostgreSQL or S3.

## Basic Audit Log with Redis Streams

```bash
# Log a user action
XADD audit:log * action "login" user_id "101" ip "192.168.1.5" result "success" ts "1711900000"
XADD audit:log * action "update_profile" user_id "101" field "email" old_val "a@b.com" new_val "c@b.com"
XADD audit:log * action "delete_record" user_id "102" resource "order:5001" result "success"
```

## Reading Audit Events

Read the last 100 audit events:

```bash
XREVRANGE audit:log + - COUNT 100
```

Read events in a time range (use Redis Stream IDs as timestamps):

```bash
# Events between two Unix timestamps (millisecond precision)
XRANGE audit:log 1711900000000 1711986400000
```

## Per-User Audit Trail

Maintain per-user audit streams for quick user-level queries:

```bash
XADD audit:user:101 * action "login" ip "192.168.1.5" result "success"
XADD audit:user:101 * action "update_profile" field "email"
XADD audit:user:102 * action "delete_record" resource "order:5001"
```

## Per-Resource Change Log

Track changes to specific resources:

```bash
XADD audit:resource:order:5001 * action "create" user_id "101" status "pending"
XADD audit:resource:order:5001 * action "update" user_id "101" status "shipped"
XADD audit:resource:order:5001 * action "delete" user_id "102"

# Full history of order 5001
XRANGE audit:resource:order:5001 - +
```

## Python Example - Audit Service

```python
import redis
import time

r = redis.Redis(decode_responses=True)

def log_event(action: str, user_id: str, details: dict):
    event = {
        "action": action,
        "user_id": user_id,
        "ts": str(int(time.time())),
        **details
    }
    # Write to global and per-user streams
    r.xadd("audit:log", event)
    r.xadd(f"audit:user:{user_id}", event)
    if "resource" in details:
        r.xadd(f"audit:resource:{details['resource']}", event)

def get_user_audit(user_id: str, count: int = 50):
    entries = r.xrevrange(f"audit:user:{user_id}", count=count)
    return [{"id": eid, **fields} for eid, fields in entries]

def get_resource_history(resource_id: str):
    entries = r.xrange(f"audit:resource:{resource_id}")
    return [{"id": eid, **fields} for eid, fields in entries]

def search_by_action(action: str, count: int = 100):
    entries = r.xrevrange("audit:log", count=count)
    return [
        {"id": eid, **fields}
        for eid, fields in entries
        if fields.get("action") == action
    ]

log_event("login", "101", {"ip": "192.168.1.5", "result": "success"})
log_event("update_profile", "101", {"field": "email", "resource": "user:101"})
log_event("delete_record", "102", {"resource": "order:5001"})

print("User 101 audit trail:")
for e in get_user_audit("101"):
    print(f"  [{e['ts']}] {e['action']}")
```

## Consumer Group for Audit Archival

Use a consumer group to process and archive audit events to a durable store:

```bash
XGROUP CREATE audit:log archiver $ MKSTREAM
```

```python
def archive_audit_events(batch_size=100):
    messages = r.xreadgroup(
        "archiver", "worker-1",
        {"audit:log": ">"},
        count=batch_size
    )
    if not messages:
        return
    stream_name, events = messages[0]
    ids_to_ack = []
    for msg_id, fields in events:
        # Write to PostgreSQL or S3 here
        archive_to_db(fields)
        ids_to_ack.append(msg_id)
    r.xack("audit:log", "archiver", *ids_to_ack)
```

## Stream Trimming

Keep only the last 30 days of events in Redis (use your archival consumer before trimming):

```bash
XTRIM audit:log MAXLEN ~ 500000
```

Or trim by minID based on timestamp:

```bash
# Remove events older than 30 days
XTRIM audit:log MINID ~ 1709308000000-0
```

## Storing Structured Metadata

For compliance, store the full request context:

```python
def log_api_request(user_id, method, path, status_code, duration_ms):
    r.xadd("audit:api", {
        "user_id": user_id,
        "method": method,
        "path": path,
        "status": str(status_code),
        "duration_ms": str(duration_ms),
        "ts": str(int(time.time()))
    })
```

## Summary

Redis Streams are a natural fit for audit trail modeling due to their append-only, ordered nature with auto-generated monotonic IDs. Maintaining per-user and per-resource streams alongside a global log enables fast targeted queries without full-scan operations. Consumer groups allow reliable archival of audit events to durable storage before trimming the Redis stream.
