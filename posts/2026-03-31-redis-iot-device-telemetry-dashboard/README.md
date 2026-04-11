# How to Build an IoT Device Telemetry Dashboard with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, IoT, Telemetry, Dashboard, Hash

Description: Power a real-time IoT telemetry dashboard using Redis hashes for latest readings, sorted sets for per-metric history, and Pub/Sub to push live updates to the browser without polling.

---

IoT dashboards need to show live sensor values, recent history, and fleet status at a glance. Redis provides all the primitives needed: hashes for the current state of every device, sorted sets for time-series history, and Pub/Sub for pushing updates to WebSocket clients.

## Storing Latest Readings

Each device reports its latest telemetry as a hash:

```python
import redis
import time

r = redis.Redis()

def update_telemetry(device_id, readings: dict):
    key = f"telemetry:latest:{device_id}"
    readings["updated_at"] = time.time()
    r.hset(key, mapping=readings)
```

Retrieve the full current state of a device:

```bash
HGETALL telemetry:latest:d-001
```

## Time-Series History with Sorted Sets

Keep the last 1,440 readings (1 per minute for 24 hours) per metric:

```python
def record_history(device_id, metric, value):
    ts = time.time()
    key = f"telemetry:history:{device_id}:{metric}"
    r.zadd(key, {f"{ts}:{value}": ts})
    r.zremrangebyrank(key, 0, -1441)  # Keep 1440 entries
```

Query a time range for charting:

```python
def get_history(device_id, metric, start_ts, end_ts):
    key = f"telemetry:history:{device_id}:{metric}"
    raw = r.zrangebyscore(key, start_ts, end_ts, withscores=True)
    return [{"value": float(m.decode().split(":")[1]), "ts": score}
            for m, score in raw]
```

## Fleet Overview

Maintain a set of all reporting devices for fleet-level queries:

```bash
SADD telemetry:active_devices d-001 d-002 d-003
```

Build a fleet snapshot by fetching all latest readings:

```python
def fleet_snapshot():
    devices = r.smembers("telemetry:active_devices")
    pipe = r.pipeline()
    for dev in devices:
        pipe.hgetall(f"telemetry:latest:{dev.decode()}")
    results = pipe.execute()
    return dict(zip([d.decode() for d in devices], results))
```

## Live Updates via Pub/Sub

Publish each telemetry update so the dashboard receives it in real time:

```python
import json

def update_and_publish(device_id, readings: dict):
    update_telemetry(device_id, readings)
    event = json.dumps({"device_id": device_id, "readings": readings})
    r.publish("telemetry:live", event)
```

The backend WebSocket handler subscribes and forwards messages to browser clients:

```python
def telemetry_broadcaster(websocket_clients):
    pubsub = r.pubsub()
    pubsub.subscribe("telemetry:live")
    for message in pubsub.listen():
        if message["type"] == "message":
            for client in websocket_clients:
                client.send(message["data"])
```

## Alert Indicator on Dashboard

Check for active alerts per device to show warning icons:

```python
def has_active_alert(device_id):
    for _ in r.scan_iter(match=f"alert:active:{device_id}:*", count=100):
        return True
    return False
```

## Aggregated Metrics for Summary Cards

Keep running counters for summary KPIs:

```bash
INCR telemetry:stats:total_readings
INCRBYFLOAT telemetry:stats:total_temperature 23.5
```

Display average temperature across the fleet:

```python
def fleet_avg_temperature():
    total = float(r.get("telemetry:stats:total_temperature") or 0)
    count = int(r.get("telemetry:stats:total_readings") or 1)
    return total / count
```

## Summary

Redis powers an IoT telemetry dashboard by combining hash-based current-state storage with sorted set history and Pub/Sub live updates. The result is a sub-second dashboard that shows real-time sensor values, historical trends, and fleet-wide KPIs without any database queries on the hot path.
