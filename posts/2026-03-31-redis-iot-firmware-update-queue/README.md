# How to Build an IoT Firmware Update Queue with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, IoT, Firmware, Queue, List

Description: Manage staged IoT firmware rollouts using Redis queues and status hashes to control update sequencing, track progress, and safely retry failed updates across large device fleets.

---

Firmware updates on large IoT fleets must be staged carefully - a bad update can brick thousands of devices. Redis provides a reliable queue for sequencing updates, tracking per-device status, and rolling out updates in controlled batches.

## Firmware Version Registry

Store available firmware versions:

```bash
HSET firmware:2.2.0 url "https://cdn.example.com/fw-2.2.0.bin" checksum "abc123" size_bytes 512000 released_at 1700000000
```

## Queuing Devices for Update

When a new firmware release is ready, add target devices to an update queue:

```python
import redis
r = redis.Redis()

def queue_firmware_update(device_ids: list, target_version: str):
    for device_id in device_ids:
        r.rpush("firmware:update:queue", device_id)
        r.hset(f"device:{device_id}:firmware_update", mapping={
            "target_version": target_version,
            "status": "queued",
            "attempts": 0,
            "queued_at": __import__("time").time()
        })
```

## Batch Processing Updates

A worker pops devices from the queue and initiates their update:

```python
def process_update_batch(batch_size=10):
    device_ids = []
    for _ in range(batch_size):
        device_id = r.lpop("firmware:update:queue")
        if not device_id:
            break
        device_ids.append(device_id.decode())
    for device_id in device_ids:
        trigger_firmware_update(device_id)
        r.hset(f"device:{device_id}:firmware_update", "status", "in_progress")
```

## Tracking Update Status

Devices report their progress during the update:

```bash
HSET device:d-001:firmware_update status downloading progress_pct 45
HSET device:d-001:firmware_update status applying progress_pct 100
HSET device:d-001:firmware_update status completed current_version 2.2.0
```

When a device reports a successful update, mark it complete and add it to the completed set:

```python
def handle_update_success(device_id, new_version):
    key = f"device:{device_id}:firmware_update"
    r.hset(key, mapping={"status": "completed", "current_version": new_version})
    r.sadd("firmware:update:completed", device_id)
```

## Handling Failures

On failure, increment retry count and re-queue or mark as failed:

```python
MAX_RETRIES = 3

def handle_update_failure(device_id):
    key = f"device:{device_id}:firmware_update"
    attempts = int(r.hget(key, "attempts") or 0) + 1
    r.hset(key, "attempts", attempts)
    if attempts < MAX_RETRIES:
        r.rpush("firmware:update:queue", device_id)
        r.hset(key, "status", "queued")
    else:
        r.hset(key, "status", "failed")
        r.sadd("firmware:update:failed", device_id)
```

## Canary Rollouts

Roll out to a small group first and check success rate before proceeding:

```python
def canary_rollout(canary_device_ids: list, target_version: str):
    queue_firmware_update(canary_device_ids, target_version)

def canary_success_rate():
    completed = r.scard("firmware:update:completed")
    failed = r.scard("firmware:update:failed")
    total = completed + failed
    return (completed / total) if total > 0 else 0
```

If the success rate drops below 95%, halt the rollout by clearing the queue:

```bash
DEL firmware:update:queue
```

## Fleet Summary

Aggregate update progress across all devices:

```bash
SCARD firmware:update:completed
SCARD firmware:update:failed
LLEN firmware:update:queue
```

## Summary

Redis queues enable safe, staged firmware rollouts with full per-device status tracking and retry logic. Canary deployments through controlled queue population let you catch bad firmware before it reaches the full fleet, and the ability to delete the queue key provides an immediate emergency stop.
