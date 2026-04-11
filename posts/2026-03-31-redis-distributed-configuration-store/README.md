# How to Build a Distributed Configuration Store with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Configuration, Distributed System, Service Mesh, Backend

Description: Build a distributed configuration store in Redis that multiple services read from with leader-based writes, namespace isolation, and real-time propagation.

---

Microservice architectures need a central source of truth for shared configuration. A Redis-based distributed config store provides sub-millisecond reads, real-time updates, and namespace isolation without the operational complexity of tools like etcd or Consul.

## Namespace-Based Key Structure

Organize config under namespaces that map to service boundaries:

```bash
# Global shared config
HSET conf:global log_level info
HSET conf:global region us-east-1

# Service-specific config
HSET conf:service:auth jwt_expiry 3600
HSET conf:service:payments stripe_timeout 5000

# Feature flags (shared)
HSET conf:features new_dashboard 1
HSET conf:features dark_mode 0
```

## Reading Config in a Service

Services read their own namespace and merge with global:

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def load_config(service_name: str) -> dict:
    global_cfg = r.hgetall("conf:global")
    service_cfg = r.hgetall(f"conf:service:{service_name}")
    feature_cfg = r.hgetall("conf:features")
    return {**global_cfg, **service_cfg, **feature_cfg}
```

## Leader-Only Writes with Distributed Lock

To prevent concurrent conflicting writes, use a Redlock-style lock before updating:

```python
import uuid

LOCK_KEY = "conf:write_lock"
LOCK_TTL = 5  # seconds

def acquire_write_lock(holder_id: str) -> bool:
    return r.set(LOCK_KEY, holder_id, nx=True, ex=LOCK_TTL) is not None

def release_write_lock(holder_id: str):
    script = """
    if redis.call('GET', KEYS[1]) == ARGV[1] then
        return redis.call('DEL', KEYS[1])
    end
    return 0
    """
    r.eval(script, 1, LOCK_KEY, holder_id)

def safe_update_config(namespace: str, key: str, value: str):
    holder_id = str(uuid.uuid4())
    if not acquire_write_lock(holder_id):
        raise RuntimeError("Could not acquire config write lock")
    try:
        r.hset(f"conf:{namespace}", key, value)
    finally:
        release_write_lock(holder_id)
```

## Broadcasting Changes

Publish a change event so all services reload their local config cache:

```python
def publish_config_change(namespace: str, key: str):
    r.publish("conf:changes", f"{namespace}:{key}")
```

```python
# In each service - subscribe to the channel
def watch_config_changes(service_name: str, config_obj):
    sub = r.pubsub()
    sub.subscribe("conf:changes")
    for msg in sub.listen():
        if msg["type"] == "message":
            namespace = msg["data"].rsplit(":", 1)[0]
            if namespace in ("global", f"service:{service_name}", "features"):
                config_obj.reload()
```

## Summary

A Redis-based distributed config store uses hash namespaces to isolate config per service while sharing global values. Write-locking prevents concurrent conflicts, and Pub/Sub delivers real-time change notifications to all subscribers. The result is a centralized config system that scales to dozens of microservices without additional infrastructure.

