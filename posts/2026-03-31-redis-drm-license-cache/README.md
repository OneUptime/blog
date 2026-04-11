# How to Implement DRM License Cache with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, DRM, Streaming

Description: Cache DRM license responses in Redis to reduce license server load, lower latency for returning viewers, and enforce concurrent stream limits per subscription.

---

Digital Rights Management (DRM) license requests occur at the start of every playback session and can overwhelm license servers during peak hours. Caching license responses in Redis reduces latency for returning viewers while still enforcing content access rights and concurrent stream limits.

## What to Cache

DRM license responses are tied to a specific (user, content, device) tuple. If a user plays the same content on the same device within a short window, the license can be served from cache. Concurrent stream limits must still be enforced in real time.

## Important Caveats

- License responses may contain encrypted content keys - treat the cache as sensitive data.
- Use Redis TLS and consider encrypting values at the application level.
- TTL must not exceed the license expiry embedded in the DRM token.

## Setup

```python
import redis
import json
import time
import hashlib

r = redis.Redis(host="localhost", port=6379, decode_responses=True, ssl=True)

LICENSE_PREFIX = "drm:license"
STREAM_PREFIX = "drm:streams"
MAX_CONCURRENT = 3  # Concurrent stream limit per subscription
LICENSE_TTL = 3600  # 1 hour - must not exceed DRM license validity
STREAM_TTL = 60     # Active stream heartbeat interval
```

## Generating a Cache Key

```python
def license_cache_key(user_id: str, content_id: str, device_id: str) -> str:
    raw = f"{user_id}:{content_id}:{device_id}"
    digest = hashlib.sha256(raw.encode()).hexdigest()
    return f"{LICENSE_PREFIX}:{digest}"
```

## Checking Concurrent Stream Limit

```python
STREAM_CHECK_SCRIPT = """
local streams_key = KEYS[1]
local stream_id = ARGV[1]
local max_concurrent = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])

-- Remove expired streams
redis.call('ZREMRANGEBYSCORE', streams_key, 0, now - ttl)

local count = redis.call('ZCARD', streams_key)

if count >= max_concurrent then
    local is_existing = redis.call('ZSCORE', streams_key, stream_id)
    if not is_existing then
        return redis.error_reply('CONCURRENT_LIMIT_EXCEEDED:' .. count)
    end
end

-- Add/refresh stream
redis.call('ZADD', streams_key, now, stream_id)
redis.call('EXPIRE', streams_key, ttl * 2)
return tostring(redis.call('ZCARD', streams_key))
"""

check_stream_limit = r.register_script(STREAM_CHECK_SCRIPT)

def enforce_concurrent_limit(user_id: str, stream_id: str) -> int:
    streams_key = f"{STREAM_PREFIX}:{user_id}"
    try:
        active = check_stream_limit(
            keys=[streams_key],
            args=[stream_id, MAX_CONCURRENT, int(time.time()), STREAM_TTL]
        )
        return int(active)
    except redis.ResponseError as e:
        raise ValueError(str(e))
```

## Getting or Generating a License

```python
def get_or_generate_license(
    user_id: str,
    content_id: str,
    device_id: str,
    stream_id: str,
    license_request: bytes
) -> dict:
    # First check concurrent stream limit
    enforce_concurrent_limit(user_id, stream_id)

    cache_key = license_cache_key(user_id, content_id, device_id)
    cached = r.get(cache_key)

    if cached:
        data = json.loads(cached)
        # Verify license has not expired
        if data.get("expires_at", 0) > int(time.time()):
            return {"source": "cache", "license": data["license_data"]}

    # Cache miss or expired - request from DRM server
    license_response = call_drm_license_server(license_request)
    expires_at = int(time.time()) + license_response.get("validity_seconds", LICENSE_TTL)

    cache_data = {
        "license_data": license_response["license"],
        "content_id": content_id,
        "expires_at": expires_at,
        "generated_at": int(time.time())
    }

    # TTL = min(license validity, LICENSE_TTL)
    cache_ttl = min(license_response.get("validity_seconds", LICENSE_TTL), LICENSE_TTL)
    r.setex(cache_key, cache_ttl, json.dumps(cache_data))

    return {"source": "generated", "license": license_response["license"]}

def call_drm_license_server(license_request: bytes) -> dict:
    # Replace with actual Widevine/FairPlay/PlayReady license server call
    return {
        "license": "base64encodedlicenseblob==",
        "validity_seconds": 3600
    }
```

## Stream Heartbeat

Clients must send heartbeats to keep their concurrent slot active:

```python
def stream_heartbeat(user_id: str, stream_id: str) -> bool:
    streams_key = f"{STREAM_PREFIX}:{user_id}"
    # Update score to current timestamp
    if r.zscore(streams_key, stream_id) is not None:
        r.zadd(streams_key, {stream_id: int(time.time())})
        return True
    return False  # Stream slot expired

def end_stream(user_id: str, stream_id: str):
    r.zrem(f"{STREAM_PREFIX}:{user_id}", stream_id)
```

## Revoking Access

```python
def revoke_user_licenses(user_id: str):
    # Delete all cached licenses for a user
    # Note: requires scanning all license keys
    # In production, maintain a per-user set of license keys
    r.delete(f"{STREAM_PREFIX}:{user_id}")
```

## Summary

A Redis DRM license cache uses SHA-256-keyed license storage with TTLs capped to license validity, a sorted-set concurrent stream tracker with heartbeat-based expiry enforcement, and atomic Lua scripts that simultaneously check the stream limit and register the new stream. This reduces license server requests for returning viewers while still enforcing subscription entitlements.
