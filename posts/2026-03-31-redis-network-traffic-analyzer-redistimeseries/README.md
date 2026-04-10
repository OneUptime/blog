# How to Build a Network Traffic Analyzer with RedisTimeSeries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisTimeSeries, Network, Traffic

Description: Collect and analyze network interface traffic metrics using RedisTimeSeries to track bandwidth utilization, packet rates, and error trends over time.

---

Network traffic analysis requires capturing bytes and packet counts at regular intervals, computing rates, and detecting anomalies. RedisTimeSeries stores these metrics efficiently and supports the range queries and aggregations needed for traffic dashboards.

## Setup

```bash
docker run -p 6379:6379 redis/redis-stack-server:latest
pip install redis psutil
```

## Creating Network Metric Series

```python
import redis
import psutil
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

NET_METRICS = [
    "bytes_sent_rate",   # bytes/sec
    "bytes_recv_rate",   # bytes/sec
    "packets_sent_rate", # packets/sec
    "packets_recv_rate", # packets/sec
    "errors_in",
    "errors_out",
    "drops_in",
    "drops_out"
]

def setup_interface_series(interface: str, host: str):
    for metric in NET_METRICS:
        key = f"net:{host}:{interface}:{metric}"
        try:
            r.execute_command(
                'TS.CREATE', key,
                'RETENTION', 86400000,  # 1 day raw
                'LABELS',
                'host', host,
                'interface', interface,
                'metric', metric
            )
        except Exception:
            pass

        # 5-minute averages for 30 days
        agg_key = f"net:{host}:{interface}:{metric}:5min"
        try:
            r.execute_command(
                'TS.CREATE', agg_key,
                'RETENTION', 30 * 86400000,
                'LABELS', 'host', host, 'interface', interface,
                'metric', metric, 'resolution', '5min'
            )
            r.execute_command(
                'TS.CREATERULE', key, agg_key,
                'AGGREGATION', 'avg', 300000
            )
        except Exception:
            pass

import socket
HOSTNAME = socket.gethostname()
interfaces = psutil.net_if_stats().keys()
for iface in interfaces:
    setup_interface_series(iface, HOSTNAME)
```

## Collecting Traffic Data

Compute rates by comparing successive counter readings:

```python
_prev_counters = {}

def collect_traffic(host: str = HOSTNAME):
    ts = int(time.time() * 1000)
    counters = psutil.net_io_counters(pernic=True)
    args = []

    for iface, stats in counters.items():
        prev = _prev_counters.get(iface)
        if prev:
            interval = 1.0  # assuming 1-second polling
            rates = {
                "bytes_sent_rate": (stats.bytes_sent - prev.bytes_sent) / interval,
                "bytes_recv_rate": (stats.bytes_recv - prev.bytes_recv) / interval,
                "packets_sent_rate": (stats.packets_sent - prev.packets_sent) / interval,
                "packets_recv_rate": (stats.packets_recv - prev.packets_recv) / interval,
                "errors_in": stats.errin,
                "errors_out": stats.errout,
                "drops_in": stats.dropin,
                "drops_out": stats.dropout
            }
            for metric, value in rates.items():
                args.extend([f"net:{host}:{iface}:{metric}", ts, max(0, value)])

        _prev_counters[iface] = stats

    if args:
        r.execute_command('TS.MADD', *args)
```

## Querying Traffic History

```python
def get_bandwidth_history(host: str, interface: str,
                           hours: int = 24):
    now = int(time.time() * 1000)
    from_ts = now - hours * 3600 * 1000

    sent = r.execute_command(
        'TS.RANGE', f"net:{host}:{interface}:bytes_sent_rate:5min",
        from_ts, now
    )
    recv = r.execute_command(
        'TS.RANGE', f"net:{host}:{interface}:bytes_recv_rate:5min",
        from_ts, now
    )

    return {
        "sent": [{"ts": int(ts), "bytes_per_sec": float(val)} for ts, val in sent],
        "recv": [{"ts": int(ts), "bytes_per_sec": float(val)} for ts, val in recv]
    }

def get_peak_bandwidth(host: str, interface: str,
                        hours: int = 24):
    now = int(time.time() * 1000)
    from_ts = now - hours * 3600 * 1000

    for direction in ["bytes_sent_rate", "bytes_recv_rate"]:
        result = r.execute_command(
            'TS.RANGE', f"net:{host}:{interface}:{direction}",
            from_ts, now, 'AGGREGATION', 'max', hours * 3600 * 1000
        )
        if result:
            _, peak = result[0]
            print(f"Peak {direction}: {float(peak) / 1024 / 1024:.2f} MB/s")
```

## Detecting High Error Rates

```python
def check_error_spike(host: str, interface: str,
                       threshold: int = 100) -> bool:
    result = r.execute_command(
        'TS.GET', f"net:{host}:{interface}:errors_in"
    )
    if result:
        _, val = result
        return float(val) > threshold
    return False
```

## Summary

RedisTimeSeries makes network traffic analysis straightforward: collect counter differences every second, batch-ingest with TS.MADD, and use compaction rules for 5-minute averages. Range queries with max aggregation identify peak bandwidth periods, while error and drop counters surface interface issues before they become outages.
