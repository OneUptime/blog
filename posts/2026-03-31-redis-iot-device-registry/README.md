# How to Build an IoT Device Registry with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, IoT, Device, Hash, Set

Description: Build a lightweight IoT device registry with Redis to store device metadata, track connectivity status, and perform fast lookups by device ID or group membership.

---

An IoT device registry is the source of truth for your fleet - it records device metadata, connection status, and group memberships. Redis is a strong fit here because of its hash storage, O(1) key lookups, and ability to handle tens of millions of keys efficiently.

## Device Metadata Storage

Store each device's metadata as a hash:

```bash
HSET device:d-001 \
  type thermometer \
  firmware_version 2.1.0 \
  location "Building A - Room 101" \
  tenant_id tenant-99 \
  registered_at 1700000000 \
  status online
```

Retrieve a field quickly:

```bash
HGET device:d-001 firmware_version
# "2.1.0"
```

## Group and Tenant Indexing

Track which devices belong to a tenant or group using sets:

```bash
SADD tenant:tenant-99:devices d-001 d-002 d-003
SADD group:hvac:devices d-001 d-004
```

List all HVAC devices:

```bash
SMEMBERS group:hvac:devices
```

Cross-reference tenant and group membership:

```bash
SINTER tenant:tenant-99:devices group:hvac:devices
```

## Online/Offline Status Tracking

Maintain a set of online devices for fast fleet-wide status queries:

```python
import redis
r = redis.Redis()

def mark_device_online(device_id):
    r.hset(f"device:{device_id}", "status", "online")
    r.sadd("devices:online", device_id)

def mark_device_offline(device_id):
    r.hset(f"device:{device_id}", "status", "offline")
    r.srem("devices:online", device_id)

def online_device_count():
    return r.scard("devices:online")
```

## Device Registration API

Register a new device in one pipeline call:

```python
def register_device(device_id, metadata: dict, tenant_id: str, groups: list):
    pipe = r.pipeline()
    pipe.hset(f"device:{device_id}", mapping=metadata)
    pipe.sadd(f"tenant:{tenant_id}:devices", device_id)
    for group in groups:
        pipe.sadd(f"group:{group}:devices", device_id)
    pipe.execute()
```

## Last-Seen Timestamp

Update the last-seen time on every heartbeat:

```bash
HSET device:d-001 last_seen 1700001234
```

Find devices that have not reported in over 10 minutes:

```python
import time

def find_stale_devices(threshold_seconds=600):
    all_devices = r.smembers("devices:online")
    stale = []
    now = time.time()
    for dev in all_devices:
        last_seen = r.hget(f"device:{dev.decode()}", "last_seen")
        if last_seen and (now - float(last_seen)) > threshold_seconds:
            stale.append(dev.decode())
    return stale
```

## Deregistering a Device

Remove all registry entries cleanly:

```python
def deregister_device(device_id, tenant_id, groups):
    pipe = r.pipeline()
    pipe.delete(f"device:{device_id}")
    pipe.srem(f"tenant:{tenant_id}:devices", device_id)
    pipe.srem("devices:online", device_id)
    for group in groups:
        pipe.srem(f"group:{group}:devices", device_id)
    pipe.execute()
```

## Summary

Redis provides a fast, memory-efficient IoT device registry by combining per-device hash storage with set-based group and tenant indexes. Online/offline tracking with sets gives instant fleet-wide counts, and pipeline operations keep registration and deregistration atomic and efficient at scale.
