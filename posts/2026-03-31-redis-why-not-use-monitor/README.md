# Why You Should Not Use MONITOR in Production Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Monitoring, Anti-Pattern

Description: Learn why the Redis MONITOR command cuts throughput by up to 50% and how to use SLOWLOG, keyspace notifications, and latency monitoring safely instead.

---

MONITOR streams every command executed by Redis to the connected client. It is invaluable for debugging - but it can cut your Redis throughput in half and expose sensitive data. Never run it on a production server without understanding the consequences.

## Why MONITOR Is Dangerous in Production

**Performance degradation.** Redis must serialize and send every command to MONITOR clients. The Redis documentation states this can reduce throughput by 50% or more under load:

```bash
# Don't run this on production:
redis-cli MONITOR

# Every command your app executes is now streamed to you:
# +1700000001.234 [0 10.0.0.1:55232] "GET" "user:session:abc123"
# +1700000001.235 [0 10.0.0.1:55232] "SET" "rate:user123:28516" "1" "EX" "60"
# ... thousands per second
```

**Data exposure.** MONITOR logs command arguments verbatim - including passwords, tokens, PII, and payment data:

```text
+1700000001.300 [0] "SET" "user:1:password_reset_token" "super_secret_token_abc"
+1700000001.301 [0] "HSET" "user:1" "ssn" "123-45-6789"
```

## Safe Alternatives

### SLOWLOG: Find Slow Commands

SLOWLOG records commands that exceed a latency threshold without impacting throughput:

```bash
# In redis.conf
slowlog-log-slower-than 10000   # Log commands > 10ms (in microseconds)
slowlog-max-len 128             # Keep last 128 slow entries
```

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_slow_commands(count: int = 10) -> list:
    entries = r.slowlog_get(count)
    return [{
        "id": e["id"],
        "duration_us": e["duration"],
        "command": e["command"],
        "timestamp": e["start_time"]
    } for e in entries]

def get_slowlog_length() -> int:
    return r.slowlog_len()
```

### Latency Monitoring

Redis built-in latency monitoring tracks event latency without intercepting commands:

```bash
# Enable latency monitoring (add to redis.conf)
latency-monitor-threshold 50   # Log events > 50ms
```

```bash
# Check latency history
LATENCY HISTORY command
LATENCY LATEST
LATENCY RESET
```

### INFO Stats for Throughput Monitoring

```python
def get_redis_stats() -> dict:
    info = r.info("all")
    return {
        "ops_per_sec": info.get("instantaneous_ops_per_sec"),
        "connected_clients": info.get("connected_clients"),
        "used_memory_human": info.get("used_memory_human"),
        "keyspace_hits": info.get("keyspace_hits"),
        "keyspace_misses": info.get("keyspace_misses"),
        "hit_rate": (
            info.get("keyspace_hits", 0) /
            max(info.get("keyspace_hits", 0) + info.get("keyspace_misses", 1), 1)
        ),
        "evicted_keys": info.get("evicted_keys"),
        "blocked_clients": info.get("blocked_clients")
    }
```

### Keyspace Notifications (Safe Event Streaming)

For event-driven monitoring of specific key patterns, use keyspace notifications:

```bash
# redis.conf - only notify on expired events
notify-keyspace-events Ex
```

```python
def watch_expired_keys():
    pubsub = r.pubsub()
    pubsub.psubscribe("__keyevent@0__:expired")

    for message in pubsub.listen():
        if message["type"] == "pmessage":
            expired_key = message["data"]
            print(f"Key expired: {expired_key}")
```

## When MONITOR Is Acceptable

```text
Acceptable:
- A read-only replica dedicated to debugging
- A staging environment during active incident investigation
- A local development instance

Never:
- Production primary or replicas serving application traffic
- Any Redis instance with PII or credential data
- Automated scripts that leave MONITOR running
```

## Summary

MONITOR halves Redis throughput and exposes every command argument - including secrets and PII - to anyone with access to the connection. Use SLOWLOG to identify slow commands, the built-in latency monitor for event timing, and keyspace notifications for targeted event subscriptions. These tools provide the observability you need without production impact.
