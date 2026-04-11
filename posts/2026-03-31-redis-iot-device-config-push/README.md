# How to Implement IoT Device Configuration Push with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, IoT, Configuration, Pub/Sub, Hash

Description: Push configuration updates to IoT devices using Redis Pub/Sub for real-time delivery and hashes for pending config storage, ensuring devices always get the latest settings.

---

IoT devices need configuration updates - sampling intervals, thresholds, firmware flags. Pushing configs in real time avoids polling delays and lets you change device behavior within seconds. Redis Pub/Sub handles delivery while hashes act as a durable config store for devices that are offline.

## Storing the Current Config

Keep the authoritative config for each device in a hash:

```bash
HSET device:d-001:config \
  sample_interval_ms 5000 \
  alert_threshold_temp 80 \
  report_mode full \
  version 7
```

Retrieve the full config in one call:

```bash
HGETALL device:d-001:config
```

## Queuing Pending Configs

When an operator updates a config, write the new values and mark the update as pending:

```python
import redis
import json
import time
r = redis.Redis()

def push_config(device_id, updates: dict):
    config_key = f"device:{device_id}:config"
    pending_key = f"device:{device_id}:config:pending"
    updates["version"] = int(r.hget(config_key, "version") or 0) + 1
    updates["updated_at"] = int(time.time())
    pipe = r.pipeline()
    pipe.hset(config_key, mapping=updates)
    pipe.set(pending_key, 1, ex=86400)
    pipe.execute()
    # Broadcast to online devices immediately
    r.publish(f"config:{device_id}", json.dumps(updates))
```

## Device Subscribing to Config Channel

An online device listens for its config updates:

```python
def device_config_listener(device_id):
    pubsub = r.pubsub()
    pubsub.subscribe(f"config:{device_id}")
    for message in pubsub.listen():
        if message["type"] == "message":
            new_config = json.loads(message["data"].decode())
            apply_config(new_config)
            acknowledge_config(device_id, new_config["version"])
```

## Config Acknowledgment

When a device applies a config, it acknowledges and clears the pending flag:

```python
def acknowledge_config(device_id, version):
    r.hset(f"device:{device_id}:config", "acked_version", version)
    r.delete(f"device:{device_id}:config:pending")
```

## Catching Up After Reconnect

When a device reconnects, check for a pending config and deliver it:

```python
def on_device_connect(device_id):
    if r.exists(f"device:{device_id}:config:pending"):
        config = r.hgetall(f"device:{device_id}:config")
        send_config_to_device(device_id, config)
```

## Group Config Push

Push the same config to all devices in a group:

```python
def push_group_config(group_id, updates: dict):
    device_ids = r.smembers(f"group:{group_id}:devices")
    for device_id in device_ids:
        push_config(device_id.decode(), updates)
```

## Config Version History

Keep the last 5 configs for rollback support:

```python
import json

def archive_config(device_id, config: dict):
    history_key = f"device:{device_id}:config:history"
    r.lpush(history_key, json.dumps(config))
    r.ltrim(history_key, 0, 4)
```

## Summary

Redis handles IoT configuration push through a combination of hash-based durable storage and Pub/Sub for real-time delivery. Pending flags ensure devices that were offline receive their config on reconnection, while version tracking and acknowledgment give operators visibility into which devices are running which configuration.
