# How to Implement Service Health Registry with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Health Check, Service Discovery, Microservice, Monitoring

Description: Build a lightweight service health registry using Redis TTLs and sorted sets so any service can query which instances are alive without a dedicated discovery server.

---

Service discovery tools like Consul are powerful but add operational overhead. For smaller deployments, Redis provides the primitives needed for a practical health registry: TTL-based heartbeats, sorted sets for staleness queries, and Pub/Sub for real-time notifications.

## Core Design

Each service instance registers itself with a heartbeat key that expires if not renewed. A sorted set tracks all instances with their last-seen timestamp as the score.

```text
Key pattern:   health:<service>:<instance-id>   (TTL = 3x heartbeat)
Sorted set:    registry:<service>               (score = epoch timestamp)
```

## Service Registration and Heartbeat

```python
import redis
import time
import threading
import socket

r = redis.Redis(host="redis", port=6379, decode_responses=True)

SERVICE = "payment"
INSTANCE_ID = socket.gethostname()
HEARTBEAT_INTERVAL = 10  # seconds
TTL = HEARTBEAT_INTERVAL * 3

def heartbeat():
    while True:
        key = f"health:{SERVICE}:{INSTANCE_ID}"
        now = int(time.time())

        pipeline = r.pipeline()
        pipeline.setex(key, TTL, "alive")
        pipeline.zadd(f"registry:{SERVICE}", {INSTANCE_ID: now})
        pipeline.execute()

        time.sleep(HEARTBEAT_INTERVAL)

# Start heartbeat in background thread
threading.Thread(target=heartbeat, daemon=True).start()
```

## Discovering Healthy Instances

```python
def get_healthy_instances(service: str, max_age_s: int = 30) -> list:
    cutoff = int(time.time()) - max_age_s
    # Return instances seen within the last max_age_s seconds
    instances = r.zrangebyscore(f"registry:{service}", cutoff, "+inf")
    return instances
```

```bash
# Manual check
ZRANGEBYSCORE registry:payment 1711843770 +inf
```

## Detecting Dead Instances

```python
def get_stale_instances(service: str, max_age_s: int = 30) -> list:
    cutoff = int(time.time()) - max_age_s
    return r.zrangebyscore(f"registry:{service}", "-inf", cutoff)

def cleanup_stale(service: str, max_age_s: int = 60):
    cutoff = int(time.time()) - max_age_s
    removed = r.zremrangebyscore(f"registry:{service}", "-inf", cutoff)
    return removed
```

## Real-Time Health Notifications

Publish events when instances go up or down using keyspace notifications:

```bash
# redis.conf
notify-keyspace-events "Ex"
```

```python
# Subscribe to expiry events for health keys
pubsub = r.pubsub()
pubsub.psubscribe("__keyevent@0__:expired")

for message in pubsub.listen():
    if message["type"] == "pmessage":
        key = message["data"]
        if key.startswith("health:"):
            _, service, instance = key.split(":", 2)
            print(f"ALERT: {service}/{instance} stopped heartbeating")
            r.publish("health:alerts", f"{service}:{instance}:down")
```

## Load-Balanced Endpoint Selection

```python
import random

def get_endpoint(service: str) -> str | None:
    instances = get_healthy_instances(service)
    if not instances:
        return None
    instance = random.choice(instances)
    return r.hget(f"endpoints:{service}:{instance}", "url")
```

Store endpoint metadata when registering:

```python
r.hset(f"endpoints:{SERVICE}:{INSTANCE_ID}", mapping={
    "url": f"http://{INSTANCE_ID}:8080",
    "region": "us-east-1",
    "version": "v2.3.1"
})
```

## Summary

A Redis-based service health registry uses TTL heartbeat keys to model liveness and sorted sets with epoch timestamps to query which instances are healthy. Keyspace notifications enable real-time alerts when a service stops heartbeating. This pattern requires no extra infrastructure and works well for deployments with dozens of service instances that do not justify a full service mesh.
