# How the noeviction Policy Works in Redis and When to Use It

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Eviction, Memory, Configuration, Reliability

Description: Learn how Redis noeviction prevents data loss by returning errors instead of evicting keys, and how to design applications to handle OOM errors safely.

---

The `noeviction` policy tells Redis never to evict any key, regardless of memory pressure. Instead of silently dropping data, Redis returns an error for write commands when memory is full. This is the right choice when data integrity matters more than availability.

## How It Works

Under `noeviction`, when Redis reaches its `maxmemory` limit:

- **Write commands** (`SET`, `LPUSH`, `XADD`, etc.) return an error: `(error) OOM command not allowed when used memory > 'maxmemory'`
- **Read commands** (`GET`, `LRANGE`, `SMEMBERS`, etc.) continue to work normally
- **No keys are evicted** under any circumstances

```bash
CONFIG SET maxmemory 1gb
CONFIG SET maxmemory-policy noeviction
```

## When to Use noeviction

Use `noeviction` when:

1. **Redis is a primary datastore**, not just a cache
2. **Data cannot be reconstructed** - losing it means permanent loss
3. **You want explicit error signals** to trigger backpressure or alerting
4. **Compliance requirements** prohibit silent data deletion

Common scenarios:
- Job queues (losing a job is unacceptable)
- Session stores where all sessions must be preserved
- Counters and analytics that cannot be recomputed
- Stream-based message buffers

## Handling OOM Errors in Application Code

Applications must be written to handle the OOM error gracefully:

```python
import redis

r = redis.Redis()

def safe_set(key, value, ttl=None, retries=3):
    """Write with OOM error handling and backpressure."""
    for attempt in range(retries):
        try:
            if ttl:
                r.set(key, value, ex=ttl)
            else:
                r.set(key, value)
            return True
        except redis.ResponseError as e:
            if "OOM" in str(e):
                print(f"Redis OOM on attempt {attempt + 1}: {e}")
                # Option 1: Raise to caller for backpressure
                if attempt == retries - 1:
                    raise
                # Option 2: Wait and retry
                import time
                time.sleep(0.1 * (attempt + 1))
            else:
                raise
    return False
```

## Monitoring Memory with noeviction

With `noeviction`, you need proactive memory monitoring to prevent OOM errors from reaching production:

```python
import redis

r = redis.Redis()

def check_memory_pressure():
    info = r.info("memory")
    used = info["used_memory"]
    max_mem = int(r.config_get("maxmemory")["maxmemory"])

    if max_mem == 0:
        return 0.0  # No limit set

    ratio = used / max_mem
    if ratio > 0.90:
        print(f"ALERT: Redis memory at {ratio:.1%} - approaching limit")
    return ratio

# Run periodically
pressure = check_memory_pressure()
```

```bash
# Check memory usage
redis-cli INFO memory | grep used_memory_human
redis-cli INFO memory | grep maxmemory_human

# Check eviction count (should always be 0 with noeviction)
redis-cli INFO stats | grep evicted_keys
```

## Combining noeviction with TTLs

Even under `noeviction`, you can (and should) set TTLs on temporary data. Redis still expires keys with TTLs normally - `noeviction` only prevents proactive eviction when memory is full:

```python
def store_job(job_id, payload, max_age_hours=24):
    """Jobs expire naturally but are never evicted."""
    r.set(f"job:{job_id}", payload, ex=max_age_hours * 3600)

def store_permanent_counter(counter_name):
    """Counters without TTL - never expire, never evicted."""
    r.incr(f"counter:{counter_name}")
```

## Alerting Setup

Configure an alert before hitting the limit:

```bash
# In redis.conf or via CONFIG SET - no native alerting,
# but you can use WAIT, INFO memory polling, or latency monitoring

# Monitor via redis-cli
redis-cli INFO memory | grep used_memory_peak_perc
```

```python
def setup_memory_alert(threshold=0.85):
    """Alert when Redis reaches threshold of maxmemory."""
    info = r.info("memory")
    used = info["used_memory"]
    max_mem_cfg = int(r.config_get("maxmemory")["maxmemory"])

    if max_mem_cfg and used / max_mem_cfg > threshold:
        # Trigger alert (PagerDuty, Slack, etc.)
        raise MemoryWarning(f"Redis at {used/max_mem_cfg:.0%} capacity")
```

## noeviction in Cluster Mode

In Redis Cluster, each shard independently enforces `noeviction`. A write to a full shard fails even if other shards have capacity:

```bash
# Per-shard memory check
redis-cli -h shard1-host INFO memory | grep used_memory_human
redis-cli -h shard2-host INFO memory | grep used_memory_human
```

## Summary

`noeviction` is the safest memory policy for Redis instances that store data that cannot be lost. It returns OOM errors instead of silently evicting keys, enabling applications to implement proper backpressure. Combine it with proactive memory monitoring, TTLs on temporary data, and OOM error handling in your application code to maintain reliability without risking silent data loss.
