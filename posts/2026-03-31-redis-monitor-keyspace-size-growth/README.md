# How to Monitor Redis Keyspace Size and Growth

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Monitoring, Keyspace, Memory, Observability

Description: Track Redis keyspace size and key growth over time using INFO keyspace, DBSIZE, Prometheus metrics, and alerting to prevent memory exhaustion.

---

The number of keys stored in Redis directly affects memory usage and lookup performance. Tracking keyspace size and growth rate helps you predict when you will run out of memory and identify write-heavy workloads before they cause problems.

## Checking Current Keyspace Size

```bash
redis-cli DBSIZE
```

For more detail per database, use:

```bash
redis-cli INFO keyspace
```

Sample output:

```text
# Keyspace
db0:keys=142500,expires=98200,avg_ttl=3600000
db1:keys=8300,expires=0,avg_ttl=0
```

This shows total keys, how many have TTLs set, and the average TTL in milliseconds.

## Measuring Key Growth Rate

Snapshot `DBSIZE` at regular intervals to calculate growth:

```bash
#!/bin/bash
INTERVAL=60
K1=$(redis-cli DBSIZE | awk '{print $1}')
sleep $INTERVAL
K2=$(redis-cli DBSIZE | awk '{print $1}')
echo "Keys added per minute: $(( K2 - K1 ))"
```

## Python Keyspace Monitor

```python
import redis
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def keyspace_growth(interval: int = 60):
    before = r.dbsize()
    time.sleep(interval)
    after = r.dbsize()
    return after - before, after

while True:
    delta, total = keyspace_growth(interval=30)
    info = r.info("keyspace")
    print(f"Total keys: {total}  Growth/30s: {delta}")
    for db, stats in info.items():
        print(f"  {db}: keys={stats['keys']} expires={stats['expires']} avg_ttl={stats.get('avg_ttl', 0)}ms")
```

## Prometheus Metrics

`redis_exporter` exposes `redis_db_keys` per database and `redis_db_keys_expiring` for keys with TTLs. Track growth with PromQL:

```text
deriv(redis_db_keys[5m])
```

An alert for rapid keyspace growth:

```text
alert: RedisKeyspaceGrowthHigh
expr: deriv(redis_db_keys[10m]) * 60 > 1000
for: 5m
labels:
  severity: warning
annotations:
  summary: "Redis keyspace growing faster than 1000 keys/min"
```

## Identifying Large Key Patterns

Use `redis-cli --bigkeys` to find the largest keys by type:

```bash
redis-cli --bigkeys -i 0.01
```

The `-i` flag adds a small delay between SCAN iterations to avoid impacting production throughput.

For a sampled key size report use:

```bash
redis-cli --memkeys --memkeys-samples 250
```

## Monitoring Keys Without TTL

Keys without expiry accumulate indefinitely. Track the ratio of expiring to total keys:

```text
redis_db_keys_expiring / redis_db_keys
```

A low ratio (below 0.5) on a cache database indicates missing TTLs and potential memory leak.

## Summary

Redis keyspace size and growth are tracked via `DBSIZE`, `INFO keyspace`, and Prometheus metrics from redis_exporter. Combine growth rate alerts with TTL coverage checks and periodic `--bigkeys` scans to catch runaway writes and memory leaks before they cause evictions or OOM crashes.
