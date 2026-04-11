# How to Monitor Redis Replication Lag

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Replication, Monitoring, Observability, Performance

Description: Learn how to measure and monitor Redis replication lag using INFO replication, offset comparisons, Prometheus metrics, and alerting strategies.

---

## What Is Replication Lag?

Replication lag is the delay between when a write command is applied on the primary and when it appears on the replica. In an ideal setup, lag is near zero. But under high write load, network issues, or slow replicas, lag can grow to seconds or more, causing replicas to serve stale data.

## Measuring Lag with INFO replication

The simplest way to check replication lag is via `INFO replication` on the primary:

```bash
redis-cli -p 6379 INFO replication
```

Relevant fields:

```text
connected_slaves:2
slave0:ip=192.168.1.11,port=6380,state=online,offset=500000,lag=0
slave1:ip=192.168.1.12,port=6381,state=online,offset=499000,lag=2
master_repl_offset:500000
```

The `lag` field shows the number of seconds since the replica last communicated. This is a liveness indicator, not a byte-level lag.

The offset difference gives a more precise measure:

```text
lag_bytes = master_repl_offset - slave_offset
         = 500000 - 499000 = 1000 bytes
```

## Calculating Byte Lag with a Script

```bash
#!/bin/bash
MASTER_OFFSET=$(redis-cli -p 6379 INFO replication | grep master_repl_offset | cut -d: -f2 | tr -d '\r\n')

for PORT in 6380 6381; do
  SLAVE_OFFSET=$(redis-cli -p $PORT INFO replication | grep slave_repl_offset | cut -d: -f2 | tr -d '\r\n')
  LAG=$((MASTER_OFFSET - SLAVE_OFFSET))
  echo "Replica $PORT: offset=$SLAVE_OFFSET, lag=$LAG bytes"
done
```

## Monitoring with redis-cli in Watch Mode

Use `redis-cli --stat` for continuous monitoring:

```bash
redis-cli --stat
```

Or watch `INFO replication` output refreshing:

```bash
watch -n 1 "redis-cli INFO replication | grep -E 'slave|master_repl_offset'"
```

## Using Keyspace Writes to Measure Lag

For application-level lag measurement, write a timestamp key to the primary periodically and measure when it appears on the replica:

```python
import redis
import time

primary = redis.Redis(host="primary", port=6379, password="pass")
replica = redis.Redis(host="replica", port=6380, password="pass")

def measure_lag():
    ts = str(time.time())
    primary.set("__lag_probe__", ts)

    deadline = time.time() + 10  # 10 second timeout
    while time.time() < deadline:
        val = replica.get("__lag_probe__")
        if val and val.decode() == ts:
            lag = time.time() - float(ts)
            return lag
        time.sleep(0.01)
    return None  # Lag exceeded timeout

lag = measure_lag()
print(f"Replication lag: {lag:.3f}s")
```

## Setting Up Prometheus Monitoring

The `redis_exporter` exposes replication metrics for Prometheus. After installing it:

```bash
redis_exporter --redis.addr redis://primary:6379 --redis.password yourpass
```

Key metrics:

```text
redis_connected_slaves                                          # Number of connected replicas
redis_master_repl_offset                                        # Primary's replication offset
redis_connected_slave_offset_bytes{slave_ip,slave_port}         # Per-slave replication offset
```

Calculate lag in PromQL:

```text
redis_master_repl_offset - redis_connected_slave_offset_bytes{slave_ip="192.168.1.11",slave_port="6380"}
```

## Grafana Dashboard for Replication Lag

In Grafana, create a panel with this PromQL:

```text
redis_master_repl_offset - redis_connected_slave_offset_bytes{slave_ip="192.168.1.11",slave_port="6380"}
```

Add an alert if lag exceeds a threshold:

```yaml
alert: RedisReplicationLagHigh
expr: redis_master_repl_offset - redis_connected_slave_offset_bytes > 1000000
for: 1m
labels:
  severity: warning
annotations:
  summary: "Redis replication lag is high"
  description: "Replication lag exceeds 1MB for more than 1 minute"
```

## Alerting on Replica Disconnection

Monitor `master_link_status` on replicas:

```bash
redis-cli -p 6380 INFO replication | grep master_link_status
```

Values:
- `up` - connected and syncing
- `down` - disconnected

Set up a check script:

```bash
#!/bin/bash
STATUS=$(redis-cli -p 6380 INFO replication | grep master_link_status | cut -d: -f2 | tr -d '\r\n')
if [ "$STATUS" != "up" ]; then
  echo "ALERT: Replica on port 6380 is disconnected!"
  # Send notification here
fi
```

## Causes of High Replication Lag

- High write throughput on the primary outpacing the replica
- Slow disk I/O on the replica (especially with AOF enabled)
- Network bandwidth saturation between primary and replica
- Replica CPU saturation from heavy read workloads or slow commands
- Large key operations (KEYS, large SORT) blocking the replica

## Reducing Replication Lag

- Ensure replicas are on fast networks (low latency to the primary)
- Use dedicated replicas for replication (avoid running heavy queries on replicas)
- Disable AOF on replicas if durability there is not required
- Increase the replication buffer on the primary if the replica falls behind during bursts

```text
client-output-buffer-limit replica 256mb 64mb 60
```

## Summary

Monitor Redis replication lag by comparing primary and replica offsets from `INFO replication`, using application-level probe keys, or through Prometheus with `redis_exporter`. Set up alerts for lag exceeding thresholds and for replica disconnections. High lag is typically caused by write throughput, I/O, or network limitations - address these by tuning replica configuration and ensuring adequate resources.
