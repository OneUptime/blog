# How to Build a Health Check System with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Health Check, Monitoring, Availability, Backend

Description: Build a Redis-backed health check system that tracks service heartbeats, detects failures via TTL expiry, and maintains a live service registry with last-seen timestamps.

---

Knowing which services are healthy in real time requires a lightweight heartbeat mechanism. Redis TTL-based keys serve as natural deadman switches - a service is healthy if its key exists, and down if the key has expired.

## Heartbeat Registration

Each service publishes a heartbeat every N seconds. The key expires after 3x the interval, so a missed heartbeat or two doesn't immediately flag the service as down:

```python
import redis
import time
import json
import threading

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

HEARTBEAT_INTERVAL = 10  # seconds
HEARTBEAT_TTL = 30       # seconds (3x interval for tolerance)

def register_service(service_name: str, host: str, port: int):
    r.hset(f"service:{service_name}", mapping={
        "host": host,
        "port": str(port),
        "registered_at": str(time.time()),
    })
    r.sadd("services:registered", service_name)

def heartbeat(service_name: str, metadata: dict = None):
    key = f"health:{service_name}"
    value = str(time.time())
    if metadata:
        value += f":{json.dumps(metadata)}"
    r.setex(key, HEARTBEAT_TTL, value)

def start_heartbeat_loop(service_name: str):
    def loop():
        while True:
            heartbeat(service_name)
            time.sleep(HEARTBEAT_INTERVAL)
    threading.Thread(target=loop, daemon=True).start()
```

## Checking Service Health

```python
def is_healthy(service_name: str) -> bool:
    return r.exists(f"health:{service_name}") == 1

def get_service_status(service_name: str) -> dict:
    raw = r.get(f"health:{service_name}")
    info = r.hgetall(f"service:{service_name}")
    if raw:
        parts = raw.split(":", 1)
        last_seen = float(parts[0])
        return {
            "service": service_name,
            "status": "healthy",
            "last_seen": last_seen,
            "age_seconds": round(time.time() - last_seen, 1),
            **info,
        }
    return {"service": service_name, "status": "down", **info}
```

## Getting All Service Statuses

```python
def get_all_statuses() -> list:
    services = r.smembers("services:registered")
    return [get_service_status(s) for s in services]

def get_unhealthy_services() -> list:
    return [s for s in get_all_statuses() if s["status"] == "down"]
```

## Health Check Endpoint

Expose a health endpoint that reports the overall system status:

```python
from flask import Flask, jsonify

app = Flask(__name__)

@app.get("/health")
def health():
    unhealthy = get_unhealthy_services()
    status = "degraded" if unhealthy else "healthy"
    return jsonify({
        "status": status,
        "services": get_all_statuses(),
        "unhealthy_count": len(unhealthy),
    }), 200 if not unhealthy else 503
```

## Monitoring

```bash
# Check TTL remaining for a service heartbeat
TTL health:payments-service

# List all registered services
SMEMBERS services:registered
```

## Summary

Redis TTL-keyed heartbeats create natural deadman switches that expire automatically when a service stops responding. A service registry set enables querying all known services at once. Combining TTL-based detection with a health endpoint gives you both passive monitoring and an active scrape target for tools like Prometheus or OneUptime.

