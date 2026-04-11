# How to Log Redis Commands for Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Debugging, Logging, Observability, DevOps

Description: Learn how to capture Redis commands in real time and persist them for debugging using MONITOR, keyspace notifications, and structured logging approaches.

---

When a Redis-backed application misbehaves, knowing exactly which commands were executed - and in what order - is invaluable. Redis provides several built-in tools for command logging, each with different trade-offs for production use.

## Using MONITOR

The `MONITOR` command streams every command processed by the server in real time:

```bash
redis-cli MONITOR
```

Output looks like:

```text
1711900400.123456 [0 127.0.0.1:52311] "SET" "session:abc" "data" "EX" "3600"
1711900400.124123 [0 127.0.0.1:52311] "GET" "user:42"
```

This is useful for short debugging sessions but should never be left running in production - it can reduce throughput by more than 50% on busy servers.

To capture output to a file:

```bash
redis-cli MONITOR > /tmp/redis-commands.log &
sleep 30
kill %1
```

## Filtering MONITOR Output

On a busy server, pipe through `grep` to focus on a specific key or command:

```bash
redis-cli MONITOR | grep '"SET"'
redis-cli MONITOR | grep 'session:'
```

## Keyspace Notifications for Targeted Logging

For production-safe logging of specific events, enable keyspace notifications. This pushes events to pub/sub channels instead of blocking the server:

```bash
redis-cli CONFIG SET notify-keyspace-events KEA
```

Then subscribe in a logging consumer:

```bash
redis-cli PSUBSCRIBE '__keyevent@0__:*'
```

Or in Python:

```python
import redis

r = redis.Redis()
pubsub = r.pubsub()
pubsub.psubscribe("__keyevent@0__:*")

for message in pubsub.listen():
    if message["type"] == "pmessage":
        print(f"Event: {message['channel']} | Data: {message['data']}")
```

This logs events like `set`, `del`, `expire`, and `lpush` without the overhead of `MONITOR`.

## Writing Commands to a Log File via Proxy

A more production-friendly approach is to proxy Redis traffic through a tool like `redis-proxy` or Envoy, which can log commands to structured output. Alternatively, wrap your Redis client:

```python
import redis
import logging

logger = logging.getLogger("redis.commands")

class LoggingRedis(redis.Redis):
    def execute_command(self, *args, **options):
        logger.info("CMD %s", " ".join(str(a) for a in args))
        return super().execute_command(*args, **options)
```

This gives you structured logs that integrate with your existing log aggregation pipeline (ELK, Loki, etc.).

## Structured JSON Logging

For log aggregation tools, emit structured JSON:

```python
import json, time, logging, redis

logger = logging.getLogger("redis.audit")

class AuditRedis(redis.Redis):
    def execute_command(self, *args, **options):
        start = time.monotonic()
        result = super().execute_command(*args, **options)
        duration_ms = (time.monotonic() - start) * 1000
        logger.info(json.dumps({
            "command": args[0],
            "key": args[1] if len(args) > 1 else None,
            "duration_ms": round(duration_ms, 2),
            "ts": time.time()
        }))
        return result
```

## Summary

Redis command logging ranges from quick debugging with `MONITOR` to production-safe approaches using keyspace notifications or client-side wrappers. For long-term visibility, emit structured logs and send them to your observability stack. Use OneUptime to alert on unusual command volumes or latency spikes captured from these logs.
