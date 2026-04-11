# How to Build an API Key Management System with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Security, API Key, Authentication

Description: Build a complete API key management system with Redis - store hashed keys, enforce per-key rate limits, track usage, and support key rotation with zero downtime.

---

API key management requires fast lookups on every request, usage tracking, and support for key rotation. Redis provides sub-millisecond key validation and atomic rate limiting in a single system.

## Data Model

```text
apikey:{keyHash}             -> Hash: user_id, name, scopes, created_at, last_used
apikey:rate:{keyHash}        -> String: request count in current window
apikey:user:{userId}:keys    -> Set of key hashes for a user
apikey:usage:{keyHash}:{day} -> String: daily request count
```

## Creating an API Key

Never store the raw key - store a hash. Return the raw key only once at creation time.

```python
import redis
import secrets
import hashlib
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def create_api_key(user_id, name, scopes=None):
    raw_key = f"sk_{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

    pipe = r.pipeline()
    pipe.hset(f"apikey:{key_hash}", mapping={
        "user_id": user_id,
        "name": name,
        "scopes": ",".join(scopes or ["read"]),
        "created_at": str(time.time()),
        "last_used": "",
        "active": "1",
    })
    pipe.sadd(f"apikey:user:{user_id}:keys", key_hash)
    pipe.execute()

    return {"key": raw_key, "key_hash": key_hash}
```

## Authenticating a Request

```python
def authenticate_api_key(raw_key):
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    data = r.hgetall(f"apikey:{key_hash}")

    if not data or data.get("active") != "1":
        return None

    # Update last used timestamp
    r.hset(f"apikey:{key_hash}", "last_used", str(time.time()))

    return {
        "user_id": data["user_id"],
        "scopes": data["scopes"].split(","),
        "key_hash": key_hash,
    }
```

## Per-Key Rate Limiting

```python
RATE_LIMIT = 1000     # requests per window
RATE_WINDOW = 3600    # 1 hour

def check_rate_limit(key_hash):
    rate_key = f"apikey:rate:{key_hash}"
    count = r.incr(rate_key)
    if count == 1:
        r.expire(rate_key, RATE_WINDOW)

    remaining = max(RATE_LIMIT - count, 0)
    ttl = r.ttl(rate_key)

    if count > RATE_LIMIT:
        return {
            "allowed": False,
            "remaining": 0,
            "reset_in": ttl,
        }
    return {
        "allowed": True,
        "remaining": remaining,
        "reset_in": ttl,
    }
```

## Usage Tracking

```python
def track_usage(key_hash):
    day = time.strftime("%Y-%m-%d")
    r.incr(f"apikey:usage:{key_hash}:{day}")
    r.expire(f"apikey:usage:{key_hash}:{day}", 90 * 86400)  # Keep 90 days

def get_usage(key_hash, days=7):
    usage = {}
    for d in range(days):
        day = time.strftime("%Y-%m-%d", time.gmtime(time.time() - d * 86400))
        count = r.get(f"apikey:usage:{key_hash}:{day}")
        usage[day] = int(count) if count else 0
    return usage
```

## Revoking and Rotating Keys

```python
def revoke_api_key(key_hash):
    r.hset(f"apikey:{key_hash}", "active", "0")

def rotate_api_key(user_id, old_key_hash, name, scopes=None):
    # Create new key
    result = create_api_key(user_id, name, scopes)
    # Keep old key active during grace period, then let it expire
    r.expire(f"apikey:{old_key_hash}", 3600)  # Old key works for 1 hour for in-flight requests
    return result

def list_user_keys(user_id):
    key_hashes = r.smembers(f"apikey:user:{user_id}:keys")
    pipe = r.pipeline()
    for kh in key_hashes:
        pipe.hgetall(f"apikey:{kh}")
    return [k for k in pipe.execute() if k and k.get("active") == "1"]
```

## Example Usage

```bash
# Validate key (hashed)
HGETALL apikey:<sha256_of_key>
# Returns: user_id, name, scopes, active

# Rate limit check
INCR apikey:rate:<sha256_of_key>
EXPIRE apikey:rate:<sha256_of_key> 3600
```

## Summary

Redis provides sub-millisecond API key authentication by storing metadata keyed by the SHA-256 hash of the raw key. Atomic INCR enforces per-key rate limits, and daily usage keys support billing and analytics. Zero-downtime key rotation is achieved by keeping the old key active for a short grace period after issuing the new one.
