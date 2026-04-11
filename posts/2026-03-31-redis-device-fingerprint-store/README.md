# How to Build a Device Fingerprint Store with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Security, Authentication, Device

Description: Store and manage device fingerprints with Redis - track trusted devices per user, detect new device logins, trigger step-up authentication, and expire old device records.

---

Device fingerprinting tracks the devices a user typically uses to log in. When a login comes from an unrecognized device, you can trigger additional verification like an email link or OTP.

## Data Model

```text
device:{userId}:{fingerprintHash}  -> Hash: user_agent, ip, first_seen, last_seen, trusted
devices:{userId}                   -> Sorted Set: fingerprintHash -> last_seen timestamp
```

## Storing a Device Fingerprint

```python
import redis
import hashlib
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

MAX_DEVICES_PER_USER = 20
DEVICE_TTL = 90 * 86400  # 90 days

def compute_fingerprint(user_agent, accept_language=""):
    raw = f"{user_agent}|{accept_language}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]

def record_device(user_id, fingerprint_hash, user_agent, ip_address):
    key = f"device:{user_id}:{fingerprint_hash}"
    now = time.time()
    existing = r.hgetall(key)

    if existing:
        # Update last seen, IP, and refresh TTL
        pipe = r.pipeline()
        pipe.hset(key, mapping={"last_seen": str(now), "ip": ip_address})
        pipe.expire(key, DEVICE_TTL)
        pipe.zadd(f"devices:{user_id}", {fingerprint_hash: now})
        pipe.execute()
        return {"is_new": False, "trusted": existing.get("trusted") == "1"}
    else:
        # New device
        pipe = r.pipeline()
        pipe.hset(key, mapping={
            "user_agent": user_agent,
            "ip": ip_address,
            "first_seen": str(now),
            "last_seen": str(now),
            "trusted": "0",
        })
        pipe.expire(key, DEVICE_TTL)
        pipe.zadd(f"devices:{user_id}", {fingerprint_hash: now})
        # Keep only the most recent MAX_DEVICES_PER_USER devices
        pipe.zremrangebyrank(f"devices:{user_id}", 0, -(MAX_DEVICES_PER_USER + 1))
        pipe.execute()
        return {"is_new": True, "trusted": False}
```

## Trusting a Device

```python
def trust_device(user_id, fingerprint_hash, ttl=DEVICE_TTL):
    key = f"device:{user_id}:{fingerprint_hash}"
    if r.exists(key):
        r.hset(key, "trusted", "1")
        r.expire(key, ttl)
        return True
    return False

def is_trusted_device(user_id, fingerprint_hash):
    trusted = r.hget(f"device:{user_id}:{fingerprint_hash}", "trusted")
    return trusted == "1"
```

## Listing User Devices

```python
def get_user_devices(user_id):
    entries = r.zrevrange(f"devices:{user_id}", 0, -1, withscores=True)
    devices = []
    pipe = r.pipeline()
    for fingerprint_hash, last_seen in entries:
        pipe.hgetall(f"device:{user_id}:{fingerprint_hash}")
    results = pipe.execute()
    for (fingerprint_hash, last_seen), data in zip(entries, results):
        if data:
            data["fingerprint"] = fingerprint_hash
            devices.append(data)
    return devices
```

## Removing a Device

```python
def remove_device(user_id, fingerprint_hash):
    pipe = r.pipeline()
    pipe.delete(f"device:{user_id}:{fingerprint_hash}")
    pipe.zrem(f"devices:{user_id}", fingerprint_hash)
    pipe.execute()

def remove_all_devices(user_id):
    entries = r.zrange(f"devices:{user_id}", 0, -1)
    pipe = r.pipeline()
    for fingerprint_hash in entries:
        pipe.delete(f"device:{user_id}:{fingerprint_hash}")
    pipe.delete(f"devices:{user_id}")
    pipe.execute()
```

## Example Usage

```bash
# Record device
HSET device:user:1:abc123 user_agent "Mozilla/5.0..." ip 1.2.3.4 trusted 0
EXPIRE device:user:1:abc123 7776000
ZADD devices:user:1 1743360000 abc123

# Check if trusted
HGET device:user:1:abc123 trusted   # 0 (new device)

# Trust after verification
HSET device:user:1:abc123 trusted 1
```

## Summary

Redis Hashes store device metadata with TTL-based expiry to naturally age out old devices. A Sorted Set capped at MAX_DEVICES_PER_USER prevents unbounded growth. When a login comes from an unrecognized device, trigger step-up authentication before recording and trusting the device. This pattern reduces friction for returning users while protecting against account takeover from stolen credentials.
