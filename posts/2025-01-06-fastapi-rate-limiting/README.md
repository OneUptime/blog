# How to Implement Rate Limiting in FastAPI Without External Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, FastAPI, Rate Limiting, API Security, Sliding Window, Performance

Description: Learn how to implement rate limiting in FastAPI using sliding window algorithms without relying on Redis or external services. This guide covers token bucket, sliding window, and adaptive rate limiting patterns.

---

> Rate limiting protects your API from abuse, ensures fair usage, and prevents cascading failures during traffic spikes. While Redis-based solutions are popular, you don't always need external dependencies. This guide shows you how to implement effective rate limiting using only Python.

Rate limiting is essential for any public API. Without it, a single client can consume all your resources, affecting other users.

---

## Rate Limiting Algorithms

| Algorithm | Pros | Cons | Best For |
|-----------|------|------|----------|
| **Fixed Window** | Simple | Burst at boundaries | Low traffic APIs |
| **Sliding Window** | Smooth limiting | More memory | Most APIs |
| **Token Bucket** | Allows bursts | Complex | Bursty traffic |
| **Leaky Bucket** | Smooth output | No bursts | Consistent rate |

---

## Fixed Window Rate Limiter

The simplest approach - count requests in fixed time windows:

```python
# fixed_window.py
from fastapi import FastAPI, Request, HTTPException
from collections import defaultdict
import time

app = FastAPI()

class FixedWindowLimiter:
    """Fixed window rate limiter"""

    def __init__(self, requests: int, window_seconds: int):
        self.requests = requests
        self.window = window_seconds
        self.counters: dict = defaultdict(lambda: {"count": 0, "window_start": 0})

    def is_allowed(self, key: str) -> bool:
        now = time.time()
        window_start = int(now / self.window) * self.window

        counter = self.counters[key]

        # Reset if new window
        if counter["window_start"] != window_start:
            counter["count"] = 0
            counter["window_start"] = window_start

        # Check limit
        if counter["count"] >= self.requests:
            return False

        counter["count"] += 1
        return True

    def get_remaining(self, key: str) -> int:
        """Get remaining requests in current window"""
        now = time.time()
        window_start = int(now / self.window) * self.window

        counter = self.counters[key]

        if counter["window_start"] != window_start:
            return self.requests

        return max(0, self.requests - counter["count"])

# 100 requests per minute
limiter = FixedWindowLimiter(requests=100, window_seconds=60)

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host

    if not limiter.is_allowed(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded",
            headers={
                "X-RateLimit-Limit": str(limiter.requests),
                "X-RateLimit-Remaining": "0",
                "Retry-After": str(limiter.window)
            }
        )

    response = await call_next(request)

    # Add rate limit headers
    response.headers["X-RateLimit-Limit"] = str(limiter.requests)
    response.headers["X-RateLimit-Remaining"] = str(limiter.get_remaining(client_ip))

    return response
```

---

## Sliding Window Rate Limiter

More accurate than fixed window - smooths out boundary bursts:

```python
# sliding_window.py
from fastapi import FastAPI, Request, HTTPException
from collections import defaultdict
import time
from typing import List

app = FastAPI()

class SlidingWindowLimiter:
    """Sliding window rate limiter using log of timestamps"""

    def __init__(self, requests: int, window_seconds: int):
        self.requests = requests
        self.window = window_seconds
        self.request_logs: dict = defaultdict(list)

    def is_allowed(self, key: str) -> bool:
        now = time.time()
        window_start = now - self.window

        # Get request log for this key
        log = self.request_logs[key]

        # Remove old entries
        self.request_logs[key] = [t for t in log if t > window_start]

        # Check limit
        if len(self.request_logs[key]) >= self.requests:
            return False

        # Add current request
        self.request_logs[key].append(now)
        return True

    def get_remaining(self, key: str) -> int:
        now = time.time()
        window_start = now - self.window

        log = self.request_logs[key]
        current_count = len([t for t in log if t > window_start])

        return max(0, self.requests - current_count)

    def get_reset_time(self, key: str) -> float:
        """Get time until oldest request expires"""
        log = self.request_logs.get(key, [])
        if not log:
            return 0

        oldest = min(log)
        return max(0, oldest + self.window - time.time())

# 100 requests per minute
limiter = SlidingWindowLimiter(requests=100, window_seconds=60)
```

### Sliding Window Counter (Memory Efficient)

For high-traffic scenarios, use counters instead of logs:

```python
# sliding_window_counter.py
import time
from collections import defaultdict

class SlidingWindowCounterLimiter:
    """Memory-efficient sliding window using counters"""

    def __init__(self, requests: int, window_seconds: int):
        self.requests = requests
        self.window = window_seconds
        # Store: {key: {window_start: count, previous_window_start: count}}
        self.counters: dict = defaultdict(lambda: {
            "current": 0,
            "previous": 0,
            "current_start": 0
        })

    def is_allowed(self, key: str) -> bool:
        now = time.time()
        window_start = int(now / self.window) * self.window

        counter = self.counters[key]

        # Rotate windows if needed
        if counter["current_start"] != window_start:
            counter["previous"] = counter["current"]
            counter["current"] = 0
            counter["current_start"] = window_start

        # Calculate weighted count
        # Weight based on position in current window
        elapsed = now - window_start
        weight = elapsed / self.window

        # Estimate requests in sliding window
        estimated = (counter["previous"] * (1 - weight)) + counter["current"]

        if estimated >= self.requests:
            return False

        counter["current"] += 1
        return True

    def get_remaining(self, key: str) -> int:
        now = time.time()
        window_start = int(now / self.window) * self.window

        counter = self.counters[key]

        if counter["current_start"] != window_start:
            return self.requests

        elapsed = now - window_start
        weight = elapsed / self.window
        estimated = (counter["previous"] * (1 - weight)) + counter["current"]

        return max(0, int(self.requests - estimated))
```

---

## Token Bucket Rate Limiter

Allows bursts up to bucket capacity:

```python
# token_bucket.py
import time
from collections import defaultdict
from dataclasses import dataclass

@dataclass
class Bucket:
    tokens: float
    last_update: float

class TokenBucketLimiter:
    """Token bucket rate limiter - allows controlled bursts"""

    def __init__(
        self,
        bucket_size: int,      # Maximum burst size
        refill_rate: float     # Tokens per second
    ):
        self.bucket_size = bucket_size
        self.refill_rate = refill_rate
        self.buckets: dict = {}

    def _get_bucket(self, key: str) -> Bucket:
        """Get or create bucket for key"""
        if key not in self.buckets:
            self.buckets[key] = Bucket(
                tokens=self.bucket_size,
                last_update=time.time()
            )
        return self.buckets[key]

    def _refill(self, bucket: Bucket) -> None:
        """Refill tokens based on elapsed time"""
        now = time.time()
        elapsed = now - bucket.last_update

        # Add tokens based on elapsed time
        bucket.tokens = min(
            self.bucket_size,
            bucket.tokens + (elapsed * self.refill_rate)
        )
        bucket.last_update = now

    def is_allowed(self, key: str, tokens: int = 1) -> bool:
        """Check if request is allowed and consume tokens"""
        bucket = self._get_bucket(key)
        self._refill(bucket)

        if bucket.tokens >= tokens:
            bucket.tokens -= tokens
            return True

        return False

    def get_remaining(self, key: str) -> int:
        """Get remaining tokens"""
        bucket = self._get_bucket(key)
        self._refill(bucket)
        return int(bucket.tokens)

    def get_wait_time(self, key: str, tokens: int = 1) -> float:
        """Get time to wait for tokens"""
        bucket = self._get_bucket(key)
        self._refill(bucket)

        if bucket.tokens >= tokens:
            return 0

        needed = tokens - bucket.tokens
        return needed / self.refill_rate

# Allow bursts of 10, refill at 1 per second (60 per minute sustained)
limiter = TokenBucketLimiter(bucket_size=10, refill_rate=1.0)
```

---

## FastAPI Integration

### Complete Rate Limiting Middleware

```python
# rate_limit_middleware.py
from fastapi import FastAPI, Request, HTTPException, Depends
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from typing import Optional, Callable
import time

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Configurable rate limiting middleware"""

    def __init__(
        self,
        app,
        limiter,
        key_func: Callable[[Request], str] = None,
        exclude_paths: list = None
    ):
        super().__init__(app)
        self.limiter = limiter
        self.key_func = key_func or self._default_key_func
        self.exclude_paths = exclude_paths or []

    def _default_key_func(self, request: Request) -> str:
        """Default: limit by IP address"""
        return f"ip:{request.client.host}"

    async def dispatch(self, request: Request, call_next):
        # Skip excluded paths
        if request.url.path in self.exclude_paths:
            return await call_next(request)

        # Get rate limit key
        key = self.key_func(request)

        # Check rate limit
        if not self.limiter.is_allowed(key):
            remaining = self.limiter.get_remaining(key)

            return Response(
                content='{"detail": "Rate limit exceeded"}',
                status_code=429,
                media_type="application/json",
                headers={
                    "X-RateLimit-Limit": str(self.limiter.requests),
                    "X-RateLimit-Remaining": str(remaining),
                    "Retry-After": str(self.limiter.window)
                }
            )

        response = await call_next(request)

        # Add rate limit headers
        remaining = self.limiter.get_remaining(key)
        response.headers["X-RateLimit-Limit"] = str(self.limiter.requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)

        return response

# Usage
app = FastAPI()

# Global rate limiter
global_limiter = SlidingWindowLimiter(requests=1000, window_seconds=60)

app.add_middleware(
    RateLimitMiddleware,
    limiter=global_limiter,
    exclude_paths=["/health", "/metrics"]
)
```

### Per-Route Rate Limiting

```python
# per_route_limiting.py
from fastapi import FastAPI, Request, HTTPException, Depends
from functools import wraps

app = FastAPI()

def rate_limit(requests: int, window: int):
    """Decorator for per-route rate limiting"""
    limiter = SlidingWindowLimiter(requests=requests, window_seconds=window)

    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            key = f"{request.url.path}:{request.client.host}"

            if not limiter.is_allowed(key):
                raise HTTPException(
                    status_code=429,
                    detail="Rate limit exceeded for this endpoint",
                    headers={
                        "X-RateLimit-Limit": str(requests),
                        "X-RateLimit-Remaining": "0",
                        "Retry-After": str(window)
                    }
                )

            return await func(request, *args, **kwargs)

        return wrapper
    return decorator

# Usage
@app.post("/api/expensive-operation")
@rate_limit(requests=10, window=60)  # 10 requests per minute
async def expensive_operation(request: Request):
    return {"result": "success"}

@app.get("/api/data")
@rate_limit(requests=100, window=60)  # 100 requests per minute
async def get_data(request: Request):
    return {"data": []}
```

### User-Based Rate Limiting

```python
# user_rate_limiting.py
from fastapi import FastAPI, Request, Depends, HTTPException
from typing import Optional

app = FastAPI()

# Different limits for different user tiers
RATE_LIMITS = {
    "free": {"requests": 100, "window": 3600},      # 100/hour
    "basic": {"requests": 1000, "window": 3600},    # 1000/hour
    "premium": {"requests": 10000, "window": 3600}, # 10000/hour
}

class UserRateLimiter:
    """Rate limiter with per-user limits"""

    def __init__(self):
        self.limiters: dict = {}

    def get_limiter(self, tier: str) -> SlidingWindowLimiter:
        """Get or create limiter for tier"""
        if tier not in self.limiters:
            config = RATE_LIMITS.get(tier, RATE_LIMITS["free"])
            self.limiters[tier] = SlidingWindowLimiter(
                requests=config["requests"],
                window_seconds=config["window"]
            )
        return self.limiters[tier]

    def is_allowed(self, user_id: str, tier: str) -> bool:
        limiter = self.get_limiter(tier)
        return limiter.is_allowed(f"user:{user_id}")

user_limiter = UserRateLimiter()

async def get_current_user(request: Request) -> dict:
    """Get current user from token"""
    # Implementation depends on your auth system
    return {"id": "user123", "tier": "basic"}

async def check_rate_limit(
    request: Request,
    user: dict = Depends(get_current_user)
):
    """Dependency to check user rate limit"""
    if not user_limiter.is_allowed(user["id"], user["tier"]):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    return user

@app.get("/api/resource")
async def get_resource(user: dict = Depends(check_rate_limit)):
    return {"user_id": user["id"]}
```

---

## Advanced Patterns

### Adaptive Rate Limiting

Adjust limits based on server load:

```python
# adaptive_limiting.py
import time
import psutil
from dataclasses import dataclass

@dataclass
class ServerMetrics:
    cpu_percent: float
    memory_percent: float
    request_latency: float

class AdaptiveRateLimiter:
    """Rate limiter that adapts to server load"""

    def __init__(
        self,
        base_requests: int,
        window_seconds: int,
        min_requests: int = 10,
        max_requests: int = 1000
    ):
        self.base_requests = base_requests
        self.min_requests = min_requests
        self.max_requests = max_requests
        self.window = window_seconds
        self._limiter = SlidingWindowLimiter(base_requests, window_seconds)
        self._last_adjustment = 0
        self._adjustment_interval = 10  # Adjust every 10 seconds

    def _get_metrics(self) -> ServerMetrics:
        """Get current server metrics"""
        return ServerMetrics(
            cpu_percent=psutil.cpu_percent(),
            memory_percent=psutil.virtual_memory().percent,
            request_latency=0  # Would come from monitoring
        )

    def _calculate_limit(self, metrics: ServerMetrics) -> int:
        """Calculate rate limit based on metrics"""
        # Scale down when server is stressed
        stress_factor = 1.0

        if metrics.cpu_percent > 80:
            stress_factor *= 0.5
        elif metrics.cpu_percent > 60:
            stress_factor *= 0.75

        if metrics.memory_percent > 85:
            stress_factor *= 0.5
        elif metrics.memory_percent > 70:
            stress_factor *= 0.75

        new_limit = int(self.base_requests * stress_factor)
        return max(self.min_requests, min(self.max_requests, new_limit))

    def _maybe_adjust(self):
        """Adjust rate limit if needed"""
        now = time.time()
        if now - self._last_adjustment < self._adjustment_interval:
            return

        metrics = self._get_metrics()
        new_limit = self._calculate_limit(metrics)

        if new_limit != self._limiter.requests:
            self._limiter.requests = new_limit

        self._last_adjustment = now

    def is_allowed(self, key: str) -> bool:
        self._maybe_adjust()
        return self._limiter.is_allowed(key)
```

### Distributed Rate Limiting (In-Process)

For multi-worker setups without Redis:

```python
# distributed_memory.py
import multiprocessing
from multiprocessing import Manager
import time

class SharedMemoryLimiter:
    """Rate limiter using shared memory for multiple workers"""

    def __init__(self, requests: int, window_seconds: int):
        self.requests = requests
        self.window = window_seconds
        self._manager = Manager()
        self._counters = self._manager.dict()
        self._lock = self._manager.Lock()

    def is_allowed(self, key: str) -> bool:
        now = time.time()
        window_start = int(now / self.window) * self.window

        with self._lock:
            counter_key = f"{key}:{window_start}"

            # Get current count
            count = self._counters.get(counter_key, 0)

            if count >= self.requests:
                return False

            # Increment
            self._counters[counter_key] = count + 1

            # Clean old windows (every 100 requests)
            if count % 100 == 0:
                self._cleanup(now)

            return True

    def _cleanup(self, now: float):
        """Remove expired windows"""
        cutoff = now - (self.window * 2)

        for key in list(self._counters.keys()):
            try:
                _, window_str = key.rsplit(":", 1)
                window_start = float(window_str)
                if window_start < cutoff:
                    del self._counters[key]
            except (ValueError, KeyError):
                pass
```

### Priority-Based Rate Limiting

```python
# priority_limiting.py
from enum import IntEnum
from typing import Dict

class Priority(IntEnum):
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4

class PriorityRateLimiter:
    """Rate limiter with priority support"""

    def __init__(self, total_requests: int, window_seconds: int):
        self.total_requests = total_requests
        self.window = window_seconds

        # Allocate capacity by priority
        self.allocations: Dict[Priority, float] = {
            Priority.LOW: 0.1,       # 10% capacity
            Priority.NORMAL: 0.3,    # 30% capacity
            Priority.HIGH: 0.4,      # 40% capacity
            Priority.CRITICAL: 0.2,  # 20% capacity (reserved)
        }

        # Create limiter for each priority
        self.limiters: Dict[Priority, SlidingWindowLimiter] = {}
        for priority, allocation in self.allocations.items():
            limit = int(total_requests * allocation)
            self.limiters[priority] = SlidingWindowLimiter(
                requests=max(1, limit),
                window_seconds=window_seconds
            )

    def is_allowed(self, key: str, priority: Priority = Priority.NORMAL) -> bool:
        """Check if request is allowed at given priority"""
        limiter = self.limiters[priority]

        if limiter.is_allowed(key):
            return True

        # Try to borrow from lower priorities
        for p in sorted(Priority, reverse=True):
            if p < priority:
                if self.limiters[p].is_allowed(key):
                    return True

        return False

# Usage
limiter = PriorityRateLimiter(total_requests=1000, window_seconds=60)

@app.get("/api/data")
async def get_data(request: Request, priority: str = "normal"):
    p = Priority[priority.upper()]
    key = request.client.host

    if not limiter.is_allowed(key, p):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    return {"data": []}
```

---

## Best Practices

### 1. Always Return Rate Limit Headers

```python
response.headers["X-RateLimit-Limit"] = str(limit)
response.headers["X-RateLimit-Remaining"] = str(remaining)
response.headers["X-RateLimit-Reset"] = str(reset_time)
response.headers["Retry-After"] = str(retry_seconds)
```

### 2. Use Appropriate Keys

```python
# By IP (anonymous)
key = f"ip:{request.client.host}"

# By user (authenticated)
key = f"user:{user_id}"

# By API key
key = f"apikey:{api_key}"

# Combined (user + endpoint)
key = f"user:{user_id}:endpoint:{request.url.path}"
```

### 3. Exempt Health Checks

```python
EXEMPT_PATHS = ["/health", "/ready", "/metrics"]

if request.url.path in EXEMPT_PATHS:
    return await call_next(request)
```

### 4. Log Rate Limit Events

```python
if not is_allowed:
    logger.warning(
        "Rate limit exceeded",
        extra={
            "key": key,
            "ip": request.client.host,
            "path": request.url.path
        }
    )
```

---

## Conclusion

Rate limiting is essential for API protection. Key takeaways:

- **Sliding window** is the best general-purpose algorithm
- **Token bucket** allows controlled bursts when needed
- **User-based limits** enable tiered pricing
- **Adaptive limits** protect during high load
- **Always return headers** so clients can adapt

With these patterns, you can implement effective rate limiting without external dependencies.

---

*Need to monitor rate limiting in production? [OneUptime](https://oneuptime.com) provides API monitoring with rate limit tracking and alerting.*

**Related Reading:**
- [How to Secure FastAPI Applications Against OWASP Top 10](https://oneuptime.com/blog/post/2025-01-06-fastapi-owasp-security/view)
