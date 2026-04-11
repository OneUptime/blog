# How to Implement Bandwidth Rate Limiting with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Rate Limiting, Bandwidth, Token Bucket, API

Description: Learn how to implement bandwidth rate limiting in Redis to control bytes transferred per user or per API key, preventing data egress abuse and ensuring fair usage.

---

Bandwidth rate limiting controls the total data volume (in bytes or megabytes) a client can transfer within a time window, rather than the number of requests. This is essential for file download APIs, streaming endpoints, and data export features where each request can vary significantly in size.

## The Challenge

Standard request-based rate limiting misses payload size. A user making 10 requests that each return 100 MB is very different from a user making 10 requests returning 1 KB each. Bandwidth limiting tracks actual bytes transferred.

## Redis Token Bucket for Bandwidth

Adapt the token bucket algorithm to count bytes instead of requests:

```lua
-- bandwidth_bucket.lua
-- KEYS[1]: bandwidth bucket key
-- ARGV[1]: capacity in bytes (e.g., 100MB = 104857600)
-- ARGV[2]: refill rate in bytes per second
-- ARGV[3]: current timestamp in milliseconds
-- ARGV[4]: bytes to consume for this request
-- Returns: {1, remaining_bytes} or {0, retry_after_ms}

local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now_ms = tonumber(ARGV[3])
local consume_bytes = tonumber(ARGV[4])

local bucket = redis.call('HMGET', key, 'bytes', 'last_refill')
local available = tonumber(bucket[1]) or capacity
local last_refill = tonumber(bucket[2]) or now_ms

local elapsed_ms = now_ms - last_refill
local refilled = elapsed_ms * refill_rate / 1000
available = math.min(capacity, available + refilled)

if available >= consume_bytes then
    available = available - consume_bytes
    redis.call('HSET', key, 'bytes', available, 'last_refill', now_ms)
    redis.call('EXPIRE', key, math.ceil(capacity / refill_rate) + 60)
    return {1, math.floor(available)}
else
    local needed = consume_bytes - available
    local retry_after_ms = math.ceil(needed / refill_rate * 1000)
    redis.call('HSET', key, 'bytes', available, 'last_refill', now_ms)
    redis.call('EXPIRE', key, math.ceil(capacity / refill_rate) + 60)
    return {0, retry_after_ms}
end
```

## Python Implementation

```python
import redis
import time

class BandwidthLimiter:
    def __init__(self, r: redis.Redis, capacity_bytes: int, refill_bytes_per_second: int):
        """
        capacity_bytes: Max burst size (e.g., 100 * 1024 * 1024 for 100MB)
        refill_bytes_per_second: Sustained bandwidth (e.g., 10 * 1024 * 1024 for 10MB/s)
        """
        self.r = r
        self.capacity = capacity_bytes
        self.refill_rate = refill_bytes_per_second
        with open('bandwidth_bucket.lua') as f:
            self.script = f.read()

    def check(self, identifier: str, bytes_requested: int) -> dict:
        key = f"bandwidth:{identifier}"
        now_ms = int(time.time() * 1000)
        result = self.r.eval(
            self.script, 1, key,
            self.capacity, self.refill_rate, now_ms, bytes_requested
        )
        allowed, value = int(result[0]), int(result[1])
        if allowed:
            return {"allowed": True, "remaining_bytes": value}
        else:
            return {"allowed": False, "retry_after_ms": value}

    def get_remaining(self, identifier: str) -> int:
        key = f"bandwidth:{identifier}"
        data = self.r.hgetall(key)
        return int(data.get("bytes", self.capacity))
```

## Flask Download Endpoint

```python
from flask import Flask, Response, request, jsonify
import io

app = Flask(__name__)
r = redis.Redis(host='localhost', decode_responses=True)

# 100MB burst, 10MB/s sustained per user
limiter = BandwidthLimiter(r,
    capacity_bytes=100 * 1024 * 1024,
    refill_bytes_per_second=10 * 1024 * 1024
)

@app.route('/api/download/<file_id>')
def download_file(file_id: str):
    user_id = request.headers.get('X-User-ID', 'anonymous')

    # Determine file size (from metadata)
    file_size = get_file_size(file_id)

    result = limiter.check(f"user:{user_id}", file_size)
    if not result["allowed"]:
        retry_s = result["retry_after_ms"] / 1000
        return jsonify({
            "error": "Bandwidth limit exceeded",
            "retry_after_seconds": round(retry_s, 1)
        }), 429, {"Retry-After": str(int(retry_s))}

    # Stream the file
    file_data = get_file_content(file_id)
    return Response(
        file_data,
        headers={
            "Content-Disposition": f"attachment; filename={file_id}",
            "X-Bandwidth-Remaining": str(result["remaining_bytes"]),
        }
    )
```

## Pre-Check Before Streaming

For large files, check bandwidth before starting the download to avoid partial transfers:

```python
def stream_with_bandwidth_check(r: redis.Redis, user_id: str,
                                 file_size: int, limiter: BandwidthLimiter):
    # Check bandwidth availability before streaming
    result = limiter.check(f"user:{user_id}", file_size)

    if not result["allowed"]:
        raise Exception(f"Insufficient bandwidth quota. Retry after {result['retry_after_ms']}ms")

    # Stream the response
    def generate():
        chunk_size = 64 * 1024  # 64KB chunks
        with open('large_file.bin', 'rb') as f:
            while chunk := f.read(chunk_size):
                yield chunk

    return generate()
```

## Monitoring Bandwidth Usage

```bash
# Check remaining bytes for a user
redis-cli hgetall bandwidth:user:123

# Convert bytes to MB
BYTES=$(redis-cli hget bandwidth:user:123 bytes)
echo "Remaining: $(echo "scale=2; $BYTES / 1048576" | bc) MB"
```

Expected output:

```text
1) "bytes"
2) "94371840"
3) "last_refill"
4) "1743379200000"
Remaining: 90.00 MB
```

## Summary

Bandwidth rate limiting adapts the token bucket algorithm to consume bytes instead of request counts. Each API call checks whether the client has sufficient bandwidth quota, consuming the actual response size. Pre-check the full size before streaming to avoid partial transfers that still consume quota. Combine bandwidth limiting with request-based rate limiting for comprehensive API protection.
