# What Is Redis Pipelining and How It Differs from Batching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pipelining, Performance

Description: Understand what Redis pipelining is, how it reduces round-trip latency, and how it differs from MULTI/EXEC batching and Lua scripts.

---

Redis pipelining is one of the most effective techniques for improving throughput. But it is often confused with transactions (MULTI/EXEC) and Lua scripts, which have different semantics. This post clarifies the differences.

## What Is Pipelining?

Without pipelining, each command requires a full round-trip: send command, wait for response, send next command. With pipelining, you send multiple commands at once and receive all responses at once:

```text
Without pipelining:
Client --> SET key1 val1 --> Redis
Client <-- OK             <-- Redis
Client --> SET key2 val2 --> Redis
Client <-- OK             <-- Redis

With pipelining:
Client --> SET key1 val1 \
           SET key2 val2  --> Redis
Client <-- OK              <-- Redis
           OK             <--
```

## Pipelining Example in Python

```python
import redis

r = redis.Redis()

# Without pipelining: 3 round-trips
r.set("key1", "val1")
r.set("key2", "val2")
r.set("key3", "val3")

# With pipelining: 1 round-trip
pipe = r.pipeline(transaction=False)
pipe.set("key1", "val1")
pipe.set("key2", "val2")
pipe.set("key3", "val3")
results = pipe.execute()
```

## Benchmarking the Difference

```bash
redis-benchmark -t set -n 100000 -P 1    # No pipelining
redis-benchmark -t set -n 100000 -P 16   # Pipeline 16 commands
```

Pipelining typically achieves 5-10x throughput improvement for small commands over high-latency connections.

## How It Differs from MULTI/EXEC

Pipelining is a network optimization - it reduces round-trips. MULTI/EXEC is a transaction mechanism - it guarantees atomicity.

| Feature | Pipeline | MULTI/EXEC |
|---|---|---|
| Atomic | No | Yes |
| Round-trips | 1 | N+2 (MULTI + N commands + EXEC) |
| Error handling | Per command | Per command (no rollback) |

You can combine both - a pipeline can contain MULTI/EXEC:

```python
pipe = r.pipeline(transaction=True)  # transaction=True adds MULTI/EXEC
pipe.set("key1", "val1")
pipe.set("key2", "val2")
pipe.execute()
```

## How It Differs from Lua Scripts

Lua scripts run server-side and are atomic. Pipelining is client-side and not atomic. Lua scripts can implement conditional logic; pipelines cannot:

```bash
# Lua can read and conditionally write
redis-cli EVAL "
  local v = redis.call('GET', KEYS[1])
  if v then redis.call('SET', KEYS[2], v) end
" 2 source dest
```

A pipeline cannot implement this conditional logic because commands are queued without seeing intermediate results.

## When to Use Pipelining

Use pipelining when:
- You have many independent commands to send
- Network latency is significant (e.g., Redis in a different data center or cloud region)
- You do not need atomicity between commands

## Summary

Redis pipelining reduces round-trip overhead by batching multiple commands into one network exchange. Unlike MULTI/EXEC, pipelining does not guarantee atomicity - commands can partially execute on connection failure. Unlike Lua scripts, pipelines cannot use conditional logic based on intermediate results. Pipelining is best for high-volume, independent write operations where throughput matters more than atomicity.
