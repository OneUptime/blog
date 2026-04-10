# How to Monitor Redis Ops Per Second

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Monitoring, Performance, Metric, Observability

Description: Learn how to track Redis operations per second using INFO stats, redis-cli, and alerting to detect traffic spikes and performance regressions.

---

Redis operations per second (ops/sec) is one of the most fundamental throughput metrics for a Redis server. Tracking it helps you understand traffic patterns, plan capacity, and catch anomalies before they cascade into outages.

## Reading Ops/Sec from INFO stats

The `INFO stats` command exposes `instantaneous_ops_per_sec`, which gives you a rolling average of commands processed per second:

```bash
redis-cli INFO stats | grep instantaneous_ops_per_sec
```

Example output:

```text
instantaneous_ops_per_sec:4321
```

For a historical view, track `total_commands_processed` and compute the delta between two readings:

```bash
redis-cli INFO stats | grep total_commands_processed
```

Divide the difference by the elapsed seconds to get average ops/sec over any interval.

## Polling with a Shell Script

A simple polling loop lets you sample ops/sec in real time:

```bash
#!/bin/bash
PREV=$(redis-cli INFO stats | grep total_commands_processed | awk -F: '{print $2}' | tr -d '\r')
sleep 5
CURR=$(redis-cli INFO stats | grep total_commands_processed | awk -F: '{print $2}' | tr -d '\r')
echo "Ops/sec over 5s: $(( (CURR - PREV) / 5 ))"
```

## Collecting Metrics with Python

Using `redis-py`, you can build a lightweight collector that logs ops/sec at regular intervals:

```python
import redis
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def get_ops_per_sec(interval: int = 5) -> float:
    before = int(r.info("stats")["total_commands_processed"])
    time.sleep(interval)
    after = int(r.info("stats")["total_commands_processed"])
    return (after - before) / interval

while True:
    ops = get_ops_per_sec(interval=10)
    print(f"Ops/sec: {ops:.1f}")
```

## Exporting to Prometheus

If you are running `redis_exporter`, the metric `redis_commands_processed_total` is scraped automatically. Compute rate in PromQL:

```text
rate(redis_commands_processed_total[1m])
```

Create an alert for unexpected spikes or sudden drops:

```text
alert: RedisHighOpsRate
expr: rate(redis_commands_processed_total[1m]) > 50000
for: 2m
labels:
  severity: warning
annotations:
  summary: "Redis ops/sec exceeds 50k"
```

## Interpreting the Numbers

- A sudden spike may indicate a traffic burst, a misconfigured client issuing excessive commands, or a keys scan running in production.
- A sudden drop may indicate a connection issue, a client-side queue backup, or a Redis instance that is unresponsive.
- Baseline your ops/sec over several days to distinguish normal peaks from anomalies.

## Correlating with Latency

Ops/sec alone is not enough. Pair it with per-command latency percentiles from `INFO latencystats` (e.g., `latency_percentiles_usec_get`) or `LATENCY HISTORY` so you can confirm whether a traffic increase is actually degrading response times.

## Summary

Redis ops per second is a core throughput metric exposed via `INFO stats` as `instantaneous_ops_per_sec` or derived from `total_commands_processed` deltas. You can collect it with a shell script, a Python poller, or a Prometheus exporter. Always correlate ops/sec with latency and memory metrics to get a complete picture of Redis health.
