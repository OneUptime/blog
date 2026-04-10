# How to Build a System Metrics Dashboard with RedisTimeSeries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisTimeSeries, Metric, Dashboard

Description: Collect CPU, memory, and disk metrics into RedisTimeSeries and build a dashboard-ready API with aggregated time-range queries.

---

A system metrics dashboard needs fast writes for metric ingestion, flexible range queries for historical views, and real-time aggregations for current status. RedisTimeSeries handles all three with a minimal footprint.

## Setup

```bash
docker run -p 6379:6379 redis/redis-stack-server:latest
pip install redis psutil
```

## Creating Metric Time Series

```python
import redis
import psutil
import time
import socket

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
HOSTNAME = socket.gethostname()

METRICS = ["cpu_percent", "mem_percent", "disk_percent",
           "net_bytes_sent", "net_bytes_recv"]

def setup_metric_series(host: str = HOSTNAME):
    for metric in METRICS:
        key = f"sys:{host}:{metric}"
        try:
            r.execute_command(
                'TS.CREATE', key,
                'RETENTION', 86400000,  # 1 day raw
                'LABELS',
                'host', host,
                'metric', metric
            )
        except Exception:
            pass

        # 5-minute averages, 30-day retention
        agg_key = f"sys:{host}:{metric}:5min"
        try:
            r.execute_command(
                'TS.CREATE', agg_key,
                'RETENTION', 30 * 86400000,
                'LABELS', 'host', host,
                'metric', metric, 'resolution', '5min'
            )
            r.execute_command(
                'TS.CREATERULE', key, agg_key,
                'AGGREGATION', 'avg', 300000
            )
        except Exception:
            pass

setup_metric_series()
```

## Collecting Metrics

```python
def collect_metrics(host: str = HOSTNAME):
    ts = int(time.time() * 1000)
    net = psutil.net_io_counters()
    disk = psutil.disk_usage('/')

    readings = [
        (f"sys:{host}:cpu_percent", ts, psutil.cpu_percent(interval=1)),
        (f"sys:{host}:mem_percent", ts, psutil.virtual_memory().percent),
        (f"sys:{host}:disk_percent", ts, disk.percent),
        (f"sys:{host}:net_bytes_sent", ts, net.bytes_sent),
        (f"sys:{host}:net_bytes_recv", ts, net.bytes_recv),
    ]

    args = []
    for key, t, val in readings:
        args.extend([key, t, val])
    r.execute_command('TS.MADD', *args)

# Collect every 15 seconds
import threading

def start_collector(interval: int = 15):
    def loop():
        while True:
            collect_metrics()
            time.sleep(interval)
    t = threading.Thread(target=loop, daemon=True)
    t.start()
```

## Querying Dashboard Data

```python
def get_metric_series(host: str, metric: str,
                       minutes: int = 60, resolution: str = 'raw'):
    if resolution == '5min':
        key = f"sys:{host}:{metric}:5min"
    else:
        key = f"sys:{host}:{metric}"

    now = int(time.time() * 1000)
    from_ts = now - minutes * 60 * 1000
    result = r.execute_command('TS.RANGE', key, from_ts, now)
    return [{"ts": int(ts), "value": float(val)} for ts, val in result]

def get_current_metrics(host: str = HOSTNAME) -> dict:
    snapshot = {}
    for metric in METRICS:
        result = r.execute_command('TS.GET', f"sys:{host}:{metric}")
        if result:
            ts, val = result
            snapshot[metric] = {"value": float(val), "ts": int(ts)}
    return snapshot
```

## Multi-Host Overview

Query all hosts using label filters:

```python
def get_all_hosts_current(metric: str) -> list:
    result = r.execute_command(
        'TS.MGET', 'WITHLABELS', 'FILTER', f'metric={metric}'
    )
    hosts = []
    for item in result:
        key = item[0]
        labels = dict(item[1])
        if item[2]:
            ts, val = item[2]
            hosts.append({
                "host": labels.get('host', key),
                "value": float(val),
                "ts": int(ts)
            })
    return hosts

# Current CPU across all monitored hosts
cpu_overview = get_all_hosts_current("cpu_percent")
```

## Summary

RedisTimeSeries provides a lightweight, fast metrics backend for system dashboards. Use TS.MADD for batched ingestion of all metrics in a single round-trip, TS.CREATERULE for automatic 5-minute aggregates, and TS.MGET with label filters to build multi-host overview panels. The entire stack runs inside Redis with no additional time-series database required.
