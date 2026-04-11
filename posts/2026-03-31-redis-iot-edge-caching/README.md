# How to Implement IoT Edge Caching with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, IoT, Edge, Cache, TTL

Description: Deploy Redis at the IoT edge to cache device configs, lookup tables, and recent sensor readings locally, reducing cloud round-trips and keeping devices operational during outages.

---

IoT edge deployments face unreliable connectivity. When a gateway cannot reach the cloud, devices must continue operating. A Redis instance at the edge caches configurations, reference data, and recent readings so that local processing continues even when upstream is unavailable.

## What to Cache at the Edge

Edge caching is most valuable for:
- Device configuration (read frequently, changes rarely)
- Reference tables (unit conversions, alert thresholds)
- Recent sensor readings for local anomaly detection
- Command responses for devices that poll the gateway

## Caching Device Configs Locally

The edge Redis caches configs pulled from the cloud:

```python
import redis
import requests

r = redis.Redis()
CLOUD_API = "https://api.example.com"

def get_device_config(device_id):
    cache_key = f"config:{device_id}"
    cached = r.hgetall(cache_key)
    if cached:
        return cached
    # Fetch from cloud
    resp = requests.get(f"{CLOUD_API}/devices/{device_id}/config", timeout=3)
    config = resp.json()
    r.hset(cache_key, mapping=config)
    r.expire(cache_key, 3600)  # Cache for 1 hour
    return config
```

## Write-Through for Sensor Readings

Store the latest reading from each device, available to local applications:

```python
import time, json

def cache_latest_reading(device_id, metric, value):
    key = f"latest:{device_id}:{metric}"
    payload = {"value": value, "ts": time.time()}
    r.set(key, json.dumps(payload), ex=300)  # Expires if device goes silent
```

Local dashboards and automation rules read from Redis instead of querying the cloud.

## Local Reference Data

Cache lookup tables at startup:

```python
def load_reference_data():
    thresholds = {
        "temperature_max": 85,
        "humidity_max": 95,
        "pressure_min": 900
    }
    r.hset("ref:thresholds", mapping=thresholds)
    r.persist("ref:thresholds")  # No expiry for reference data

def get_threshold(metric):
    return float(r.hget("ref:thresholds", metric) or 0)
```

## Offline Queue for Cloud Sync

When the cloud is unreachable, buffer events locally for later upload:

```python
def queue_for_cloud(event: dict):
    r.rpush("edge:outbox", json.dumps(event))

def flush_outbox():
    while True:
        raw = r.lpop("edge:outbox")
        if not raw:
            break
        event = json.loads(raw)
        try:
            requests.post(f"{CLOUD_API}/events", json=event, timeout=5)
        except requests.RequestException:
            r.lpush("edge:outbox", raw)  # Re-queue on failure
            break
```

## Cache Invalidation on Config Push

When the cloud pushes a new config, invalidate the edge cache:

```bash
redis-cli DEL config:d-001
```

Or use Pub/Sub to broadcast invalidation:

```python
def invalidate_edge_config(device_id):
    r.publish("edge:invalidate", f"config:{device_id}")
```

The edge subscriber deletes the key on receiving the message.

## Memory Management

Configure Redis on the edge to evict the least recently used keys when memory is tight:

```bash
redis-cli CONFIG SET maxmemory 256mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

This ensures the most active device configs stay in cache.

## Summary

A Redis instance at the IoT edge reduces cloud dependency by caching device configs, sensor readings, and reference data locally. An offline outbox queue ensures no data is lost during connectivity gaps, and LRU eviction policies keep memory usage bounded - making the edge gateway resilient and self-sufficient.
