# How to Use Keyspace Notifications for Audit Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Keyspace Notification, Audit, Logging

Description: Implement Redis audit logging using keyspace notifications to record who changed what and when, without modifying application write code.

---

Audit logging with Redis keyspace notifications lets you record every write operation on sensitive keys transparently. The application writes to Redis as normal, and a dedicated subscriber records the audit trail.

## What Can and Cannot Be Logged

Keyspace notifications deliver:
- The key that changed
- The operation type (`set`, `del`, `hset`, `lpush`, etc.)
- The database number
- The timestamp (from your subscriber)

They do NOT deliver:
- The old value
- The new value
- The client identity (username or IP)

For value-level auditing, read the current value in the notification handler using the appropriate command (`GET`, `HGETALL`, etc.), keeping in mind that a race condition exists if the key is modified again before the read completes.

## Configuration

```bash
# Enable keyevent notifications for all data types and generic commands
redis-cli CONFIG SET notify-keyspace-events "KEA"
```

## Basic Audit Logger

```python
import redis
import json
import datetime
import threading

class RedisAuditLogger:
    def __init__(self, redis_client, audit_key_patterns=None):
        self.r = redis_client
        self.patterns = audit_key_patterns or ["*"]
        self.pubsub = self.r.pubsub()
        self.log_key = "audit:log"

    def _should_audit(self, key):
        import fnmatch
        return any(fnmatch.fnmatch(key, p) for p in self.patterns)

    def _record(self, key, operation):
        entry = {
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "key": key,
            "operation": operation,
        }
        # Store in a Redis list capped at 10000 entries
        pipe = self.r.pipeline()
        pipe.lpush(self.log_key, json.dumps(entry))
        pipe.ltrim(self.log_key, 0, 9999)
        pipe.execute()
        print(f"AUDIT: {entry}")

    def start(self):
        self.pubsub.psubscribe("__keyevent@0__:*")
        thread = threading.Thread(target=self._listen, daemon=True)
        thread.start()

    def _listen(self):
        for message in self.pubsub.listen():
            if message["type"] == "pmessage":
                operation = message["channel"].split(":")[-1]
                key = message["data"]
                if self._should_audit(key):
                    self._record(key, operation)

r = redis.Redis(decode_responses=True)
logger = RedisAuditLogger(r, audit_key_patterns=["user:*", "config:*", "secret:*"])
logger.start()
```

## Querying the Audit Log

```python
def get_recent_audit_entries(r, count=50):
    raw = r.lrange("audit:log", 0, count - 1)
    return [json.loads(entry) for entry in raw]

entries = get_recent_audit_entries(r)
for e in entries:
    print(f"{e['timestamp']}  {e['operation']:10s}  {e['key']}")
```

Output:

```text
2026-03-31T12:00:01  set         user:42
2026-03-31T12:00:02  hset        config:auth
2026-03-31T12:00:05  del         secret:token:abc
```

## Shipping to an External Audit Store

For compliance, forward audit events to an immutable store:

```python
import boto3

s3 = boto3.client("s3")

def ship_to_s3(entry):
    key = f"redis-audit/{entry['timestamp'][:10]}/{entry['timestamp']}.json"
    s3.put_object(
        Bucket="my-audit-bucket",
        Key=key,
        Body=json.dumps(entry)
    )

# Add to _record method
ship_to_s3(entry)
```

## Using Redis ACL LOG for Identity Tracking

Keyspace notifications do not reveal client identity. Redis ACL logging captures some client context, but only for denied commands. For allowed commands, use the `CLIENT SETNAME` convention or the metadata key approach shown below:

```bash
# Redis 7+ command logging via ACL
redis-cli ACL LOG RESET
redis-cli ACL LOG 10
redis-cli ACL LOG
```

To associate a client identity with writes, have clients set a metadata key before writing:

```python
def audited_set(r, client_id, key, value):
    pipe = r.pipeline()
    pipe.set(f"_meta:last_writer:{key}", client_id, ex=60)
    pipe.set(key, value)
    pipe.execute()
```

The subscriber then reads `_meta:last_writer:{key}` when it receives the `set` event.

## Retention and Rotation

```python
def rotate_audit_log(r, max_age_days=30):
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=max_age_days)
    entries = r.lrange("audit:log", 0, -1)
    to_remove = [
        e for e in entries
        if json.loads(e)["timestamp"] < cutoff.isoformat()
    ]
    for entry in to_remove:
        r.lrem("audit:log", 1, entry)
```

## Summary

Redis keyspace notifications provide a transparent audit hook that records all write operations without modifying application code. The audit log captures key name, operation type, and timestamp. For client identity, supplement with metadata keys or Redis ACL logging. Always ship audit data to an immutable external store for compliance requirements.
