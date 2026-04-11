# How to Design a Redis-Based Microservices Architecture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Microservice, Architecture, Pub/Sub, Cache

Description: Design a microservices architecture that uses Redis as a shared cache, message bus, and distributed lock manager to reduce inter-service latency and coupling.

---

Microservices architectures often suffer from chatty inter-service communication. Redis can serve three roles simultaneously: a shared cache to reduce duplicate database queries, a lightweight message bus for async events, and a distributed lock manager for coordinating critical sections.

## Role 1: Shared Cache

Services cache their data in Redis so other services can read it without an API call:

```python
import redis
import json

r = redis.Redis()

# User service writes user profile
def cache_user(user_id, profile):
    r.set(f"user:{user_id}", json.dumps(profile), ex=3600)

# Order service reads user profile directly from cache
def get_user_for_order(user_id):
    cached = r.get(f"user:{user_id}")
    if cached:
        return json.loads(cached)
    return call_user_service_api(user_id)
```

Use a consistent key naming convention: `{service}:{entity}:{id}`.

## Role 2: Async Event Bus

Services publish domain events; other services subscribe and react:

```python
def publish_order_placed(order_id, user_id, amount):
    event = json.dumps({"order_id": order_id, "user_id": user_id, "amount": amount})
    r.publish("events:order.placed", event)

def notification_service():
    pubsub = r.pubsub()
    pubsub.subscribe("events:order.placed")
    for message in pubsub.listen():
        if message["type"] == "message":
            event = json.loads(message["data"])
            send_order_confirmation(event["user_id"], event["order_id"])
```

For durability, use Streams instead of Pub/Sub when events must not be lost:

```python
def publish_durable_event(event_type, payload):
    r.xadd(f"events:{event_type}", payload, maxlen=100000, approximate=True)
```

## Role 3: Distributed Lock Manager

Prevent duplicate processing across service instances:

```python
import uuid

def acquire_lock(resource, ttl=30):
    lock_id = str(uuid.uuid4())
    acquired = r.set(f"lock:{resource}", lock_id, nx=True, ex=ttl)
    return lock_id if acquired else None

def release_lock(resource, lock_id):
    script = """
    if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
    end
    return 0
    """
    r.eval(script, 1, f"lock:{resource}", lock_id)
```

## Service Discovery with Redis

Register service instances and their addresses:

```bash
SET services:order-service:instance-1 "10.0.0.1:8080" EX 30
SET services:order-service:instance-2 "10.0.0.2:8080" EX 30
```

Set a TTL on each instance registration and renew it on heartbeat:

```python
def register_service(service_name, instance_id, address, ttl=30):
    key = f"services:{service_name}:{instance_id}"
    r.set(key, address, ex=ttl)

def lookup_service(service_name):
    import random
    keys = r.keys(f"services:{service_name}:*")
    if not keys:
        raise Exception(f"No instances of {service_name} available")
    address = r.get(random.choice(keys))
    return address.decode() if address else None
```

## Key Namespace Strategy

Enforce service ownership through key prefixes:

```text
user:{id}           -> owned by user-service
order:{id}          -> owned by order-service
lock:{resource}     -> owned by any service
events:{type}       -> shared
```

Never let services write to another service's namespace - treat it as a contract violation.

## Summary

Redis consolidates three critical microservices infrastructure concerns - caching, async messaging, and coordination - into a single dependency. Consistent key namespaces enforce service boundaries, Streams provide durable event delivery when Pub/Sub is insufficient, and the distributed lock primitive prevents concurrency bugs across service replicas.
