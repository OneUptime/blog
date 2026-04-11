# How to Implement Exact Counting with Redis Strings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Counter, String, Atomic, Analytics

Description: Use Redis string commands INCR, INCRBY, and INCRBYFLOAT for exact atomic counters with overflow protection and pipeline optimization.

---

Redis strings are the simplest and most efficient way to maintain exact counts. The INCR family of commands operates atomically, meaning no lost increments even under high concurrency. This post covers patterns for building reliable exact counters at scale.

## Basic Atomic Counter

`INCR` atomically increments an integer stored as a string. It creates the key if it does not exist, starting from 0:

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Increment by 1
count = r.incr("counter:page_views")
print(f"Page views: {count}")

# Increment by N
count = r.incrby("counter:bytes_transferred", 1024)

# Decrement
count = r.decr("counter:available_seats")
count = r.decrby("counter:available_seats", 5)
```

## Counter with Reset Capability

For counters that reset on demand (e.g., per-session event counts):

```python
def reset_counter(name: str) -> int:
    old = r.set(f"counter:{name}", 0, get=True)
    return int(old or 0)

# Or atomically get and delete
def consume_counter(name: str) -> int:
    pipe = r.pipeline()
    pipe.get(f"counter:{name}")
    pipe.delete(f"counter:{name}")
    val, _ = pipe.execute()
    return int(val or 0)
```

## Batch Increments with Pipeline

When recording many events simultaneously, pipeline reduces round trips:

```python
def batch_increment(counters: dict):
    pipe = r.pipeline()
    for key, value in counters.items():
        pipe.incrby(f"counter:{key}", value)
    return pipe.execute()

# Record multiple metrics at once
batch_increment({
    "requests": 1,
    "bytes_in": 512,
    "bytes_out": 2048,
})
```

## Floating-Point Counters

`INCRBYFLOAT` enables fractional increments for metrics like response time accumulation:

```python
def record_response_time(endpoint: str, duration_ms: float):
    pipe = r.pipeline()
    pipe.incrbyfloat(f"total_time:{endpoint}", duration_ms)
    pipe.incr(f"request_count:{endpoint}")
    total_time, count = pipe.execute()
    avg_ms = float(total_time) / int(count) if int(count) > 0 else 0
    return avg_ms
```

## Overflow Protection

Redis integers are signed 64-bit, but for application-level safety you can cap counters with Lua:

```lua
-- safe_incr.lua
local key = KEYS[1]
local max = tonumber(ARGV[1])
local current = tonumber(redis.call("GET", key) or 0)
if current >= max then
    return current
end
return redis.call("INCR", key)
```

```python
safe_incr = r.register_script(open("safe_incr.lua").read())

def capped_increment(key: str, max_value: int) -> int:
    return safe_incr(keys=[f"counter:{key}"], args=[max_value])
```

## Reading Many Counters at Once

Use `MGET` to fetch multiple counters in a single command:

```python
def get_stats(metrics: list) -> dict:
    keys = [f"counter:{m}" for m in metrics]
    values = r.mget(keys)
    return {
        metric: int(val or 0)
        for metric, val in zip(metrics, values)
    }
```

## Summary

Redis string counters powered by INCR, INCRBY, and INCRBYFLOAT provide exact, atomic counts with no locking overhead. Pipeline batching minimizes round trips for multi-metric workloads, and Lua scripts add application-level guards like overflow caps. This makes Redis strings the go-to choice when you need precise event counts at high throughput.
