# How to Implement Service Discovery with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Service Discovery, Microservice, Health Check, Pub/Sub

Description: Implement lightweight service discovery using Redis to register, deregister, and query microservice instances with automatic health-based expiration.

---

## Overview

Service discovery allows microservices to find each other dynamically without hardcoded addresses. Redis provides a simple, fast service registry using Keys with TTLs (for heartbeat-based health checking), Hashes for service metadata, and Pub/Sub for real-time change notifications.

## Service Registration

Services register themselves on startup and refresh their TTL periodically as a heartbeat:

```python
import socket
import time
import json
import uuid
from redis import Redis
import threading

r = Redis(host='localhost', port=6379, decode_responses=True)

SERVICE_TTL = 30  # seconds - if no heartbeat, service is deregistered

def register_service(
    service_name: str,
    host: str = None,
    port: int = 8080,
    metadata: dict = None
) -> str:
    """Register a service instance in the registry."""
    instance_id = str(uuid.uuid4())[:8]
    host = host or socket.gethostname()

    service_data = {
        "id": instance_id,
        "name": service_name,
        "host": host,
        "port": str(port),
        "address": f"{host}:{port}",
        "registered_at": str(int(time.time())),
        **(metadata or {})
    }

    key = f"service:{service_name}:{instance_id}"
    r.hset(key, mapping=service_data)
    r.expire(key, SERVICE_TTL)

    # Add to the service index
    r.sadd(f"services:{service_name}", instance_id)

    # Publish registration event
    r.publish("services:events", json.dumps({
        "event": "registered",
        "service": service_name,
        "instance_id": instance_id,
        "address": f"{host}:{port}"
    }))

    return instance_id

def heartbeat(service_name: str, instance_id: str):
    """Refresh TTL to signal the service is still alive."""
    key = f"service:{service_name}:{instance_id}"
    if r.exists(key):
        r.expire(key, SERVICE_TTL)
        return True
    return False

def deregister_service(service_name: str, instance_id: str):
    """Explicitly deregister a service instance."""
    key = f"service:{service_name}:{instance_id}"
    r.delete(key)
    r.srem(f"services:{service_name}", instance_id)
    r.publish("services:events", json.dumps({
        "event": "deregistered",
        "service": service_name,
        "instance_id": instance_id
    }))
```

## Heartbeat Thread

```python
def start_heartbeat(service_name: str, instance_id: str, interval: int = 10):
    """Start a background thread to send heartbeats."""
    def send_heartbeats():
        current_id = instance_id
        while True:
            try:
                alive = heartbeat(service_name, current_id)
                if not alive:
                    # Re-register if TTL expired (recovery scenario)
                    current_id = register_service(service_name)
            except Exception:
                pass
            time.sleep(interval)

    thread = threading.Thread(target=send_heartbeats, daemon=True)
    thread.start()
    return thread
```

## Service Discovery

```python
def get_service_instances(service_name: str) -> list[dict]:
    """Get all healthy instances of a service."""
    instance_ids = r.smembers(f"services:{service_name}")
    if not instance_ids:
        return []

    instances = []
    for instance_id in instance_ids:
        key = f"service:{service_name}:{instance_id}"
        data = r.hgetall(key)
        if data:  # TTL not expired = healthy
            instances.append({
                **data,
                "ttl": r.ttl(key)
            })
        else:
            # Clean up stale index entry
            r.srem(f"services:{service_name}", instance_id)

    return instances

def get_service_address(service_name: str) -> str | None:
    """Get a single service address (random selection)."""
    instances = get_service_instances(service_name)
    if not instances:
        return None

    # Simple random selection from healthy instances
    import random
    instance = random.choice(instances)
    return instance.get("address")

def get_all_services() -> dict:
    """Get registry of all services and their instance counts."""
    # Find all service index keys
    service_keys = r.keys("services:*")
    result = {}
    for key in service_keys:
        service_name = key.split(":", 1)[1]
        instances = get_service_instances(service_name)
        result[service_name] = {
            "instance_count": len(instances),
            "instances": instances
        }
    return result
```

## Health Status Tracking

```python
def update_service_health(
    service_name: str,
    instance_id: str,
    status: str,
    details: dict = None
):
    """Update health check details for a service instance."""
    key = f"service:{service_name}:{instance_id}"
    health_data = {
        "health_status": status,  # healthy, degraded, unhealthy
        "health_checked_at": str(int(time.time())),
        **(details or {})
    }
    r.hset(key, mapping=health_data)
    r.expire(key, SERVICE_TTL)

def get_healthy_instances(service_name: str) -> list[dict]:
    """Get only instances reporting healthy status."""
    all_instances = get_service_instances(service_name)
    return [i for i in all_instances if i.get("health_status") != "unhealthy"]
```

## Service Change Notifications

```python
class ServiceWatcher:
    """Watch for service registry changes via Pub/Sub."""

    def __init__(self):
        self._handlers = []
        self._start()

    def on_change(self, handler):
        self._handlers.append(handler)
        return self

    def _start(self):
        def listen():
            sub = r.pubsub()
            sub.subscribe("services:events")
            for message in sub.listen():
                if message["type"] == "message":
                    try:
                        event = json.loads(message["data"])
                        for handler in self._handlers:
                            handler(event)
                    except Exception:
                        pass

        thread = threading.Thread(target=listen, daemon=True)
        thread.start()

watcher = ServiceWatcher()
watcher.on_change(lambda event: print(f"Service event: {event}"))
```

## Usage Example

```python
# Service startup
instance_id = register_service(
    "payment-service",
    port=8001,
    metadata={"version": "2.1.0", "region": "us-east-1"}
)

# Start heartbeat
start_heartbeat("payment-service", instance_id)

# Client discovery
address = get_service_address("payment-service")
print(f"Calling payment service at: {address}")

# List all instances
instances = get_service_instances("payment-service")
for inst in instances:
    print(f"  {inst['address']} - health: {inst.get('health_status', 'unknown')}")
```

## Summary

Redis implements a lightweight service registry using TTL-based keys for automatic health expiration, Hashes for instance metadata, and Pub/Sub for real-time change notifications. Services publish heartbeats to refresh their TTL, and any instance that stops heartbeating is automatically removed when its TTL expires. This approach requires no separate service discovery infrastructure and works well for small to medium-sized microservice deployments.
