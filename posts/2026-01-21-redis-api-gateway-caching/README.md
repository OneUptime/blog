# How to Use Redis for API Gateway Caching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, API Gateway, Caching, Response Aggregation, Microservices, Performance

Description: A comprehensive guide to implementing API gateway caching with Redis, including response caching, request aggregation, and cache invalidation strategies.

---

API gateway caching reduces latency and backend load by storing responses in Redis. This guide covers practical patterns for implementing efficient caching at the gateway layer.

## Why Cache at the API Gateway?

Gateway-level caching provides several benefits:

- **Reduced latency**: Serve cached responses without hitting backend services
- **Lower backend load**: Fewer requests reach origin servers
- **Improved availability**: Serve stale content during backend outages
- **Request deduplication**: Combine identical concurrent requests

## Pattern 1: Basic Response Caching

Implement simple response caching:

```python
import redis
import json
import hashlib
import time
from typing import Dict, Any, Optional, Callable
from dataclasses import dataclass
from functools import wraps
import logging

logger = logging.getLogger(__name__)

@dataclass
class CachedResponse:
    status_code: int
    headers: Dict[str, str]
    body: Any
    cached_at: float
    ttl: int

class GatewayCache:
    def __init__(self, redis_client: redis.Redis, default_ttl: int = 300):
        self.redis = redis_client
        self.default_ttl = default_ttl
        self._prefix = "gateway:cache"

    def _generate_cache_key(self, method: str, path: str,
                            query_params: Dict[str, str] = None,
                            headers: Dict[str, str] = None,
                            vary_headers: list = None) -> str:
        """Generate cache key from request."""
        key_parts = [method.upper(), path]

        # Include query params
        if query_params:
            sorted_params = sorted(query_params.items())
            key_parts.append(str(sorted_params))

        # Include vary headers
        if vary_headers and headers:
            for header in vary_headers:
                value = headers.get(header, "")
                key_parts.append(f"{header}:{value}")

        key_string = "|".join(key_parts)
        key_hash = hashlib.sha256(key_string.encode()).hexdigest()[:32]

        return f"{self._prefix}:{key_hash}"

    def get(self, method: str, path: str,
            query_params: Dict[str, str] = None,
            headers: Dict[str, str] = None,
            vary_headers: list = None) -> Optional[CachedResponse]:
        """Get cached response."""
        cache_key = self._generate_cache_key(
            method, path, query_params, headers, vary_headers
        )

        data = self.redis.get(cache_key)
        if data:
            cached = json.loads(data)
            return CachedResponse(**cached)

        return None

    def set(self, method: str, path: str, response: CachedResponse,
            query_params: Dict[str, str] = None,
            headers: Dict[str, str] = None,
            vary_headers: list = None,
            ttl: int = None):
        """Cache a response."""
        cache_key = self._generate_cache_key(
            method, path, query_params, headers, vary_headers
        )

        ttl = ttl or self.default_ttl
        response.ttl = ttl
        response.cached_at = time.time()

        self.redis.setex(
            cache_key,
            ttl,
            json.dumps({
                "status_code": response.status_code,
                "headers": response.headers,
                "body": response.body,
                "cached_at": response.cached_at,
                "ttl": response.ttl
            })
        )

    def invalidate(self, method: str, path: str,
                   query_params: Dict[str, str] = None):
        """Invalidate cached response."""
        cache_key = self._generate_cache_key(method, path, query_params)
        self.redis.delete(cache_key)

    def invalidate_pattern(self, pattern: str):
        """Invalidate all keys matching pattern."""
        cursor = 0
        deleted = 0

        while True:
            cursor, keys = self.redis.scan(
                cursor=cursor,
                match=f"{self._prefix}:{pattern}",
                count=100
            )

            if keys:
                self.redis.delete(*keys)
                deleted += len(keys)

            if cursor == 0:
                break

        logger.info(f"Invalidated {deleted} cached responses")
        return deleted

# Flask middleware example
from flask import Flask, request, Response, g

app = Flask(__name__)
redis_client = redis.Redis()
cache = GatewayCache(redis_client)

CACHEABLE_METHODS = {"GET", "HEAD"}
VARY_HEADERS = ["Accept", "Accept-Language"]

@app.before_request
def check_cache():
    """Check cache before processing request."""
    if request.method not in CACHEABLE_METHODS:
        return None

    cached = cache.get(
        request.method,
        request.path,
        dict(request.args),
        dict(request.headers),
        VARY_HEADERS
    )

    if cached:
        g.cache_hit = True
        response = Response(
            json.dumps(cached.body),
            status=cached.status_code,
            headers=cached.headers
        )
        response.headers['X-Cache'] = 'HIT'
        response.headers['X-Cache-Age'] = str(
            int(time.time() - cached.cached_at)
        )
        return response

    g.cache_hit = False
    return None

@app.after_request
def cache_response(response):
    """Cache successful responses."""
    if g.get('cache_hit'):
        return response

    if request.method not in CACHEABLE_METHODS:
        return response

    if response.status_code != 200:
        return response

    # Check Cache-Control header
    cache_control = response.headers.get('Cache-Control', '')
    if 'no-store' in cache_control or 'private' in cache_control:
        return response

    # Extract max-age if present
    ttl = 300  # default
    if 'max-age=' in cache_control:
        try:
            ttl = int(cache_control.split('max-age=')[1].split(',')[0])
        except (ValueError, IndexError):
            pass

    cached_response = CachedResponse(
        status_code=response.status_code,
        headers=dict(response.headers),
        body=response.get_json(),
        cached_at=time.time(),
        ttl=ttl
    )

    cache.set(
        request.method,
        request.path,
        cached_response,
        dict(request.args),
        dict(request.headers),
        VARY_HEADERS,
        ttl
    )

    response.headers['X-Cache'] = 'MISS'
    return response
```

## Pattern 2: Request Coalescing

Combine identical concurrent requests:

```python
import redis
import json
import time
import threading
from typing import Dict, Any, Callable, Optional
import logging

logger = logging.getLogger(__name__)

class RequestCoalescer:
    def __init__(self, redis_client: redis.Redis, timeout: int = 5):
        self.redis = redis_client
        self.timeout = timeout
        self._prefix = "gateway:coalesce"
        self._local_waiters: Dict[str, threading.Event] = {}
        self._local_results: Dict[str, Any] = {}

    def _request_key(self, key: str) -> str:
        return f"{self._prefix}:{key}"

    def _result_key(self, key: str) -> str:
        return f"{self._prefix}:result:{key}"

    def execute_or_wait(self, key: str, executor: Callable[[], Any]) -> Any:
        """Execute request or wait for existing one."""
        request_key = self._request_key(key)
        result_key = self._result_key(key)

        # Try to become the leader
        is_leader = self.redis.set(
            request_key,
            "1",
            nx=True,
            ex=self.timeout
        )

        if is_leader:
            # We're the leader - execute the request
            try:
                result = executor()

                # Store result for waiters
                self.redis.setex(
                    result_key,
                    self.timeout,
                    json.dumps(result)
                )

                # Publish completion
                self.redis.publish(f"{request_key}:done", "1")

                return result

            except Exception as e:
                # Publish error
                self.redis.publish(
                    f"{request_key}:done",
                    json.dumps({"error": str(e)})
                )
                raise

            finally:
                self.redis.delete(request_key)

        else:
            # Wait for leader to complete
            return self._wait_for_result(key)

    def _wait_for_result(self, key: str) -> Any:
        """Wait for leader to complete request."""
        request_key = self._request_key(key)
        result_key = self._result_key(key)

        # Subscribe to completion channel
        pubsub = self.redis.pubsub()
        pubsub.subscribe(f"{request_key}:done")

        try:
            # First check if result already available
            result = self.redis.get(result_key)
            if result:
                return json.loads(result)

            # Wait for completion message
            deadline = time.time() + self.timeout
            while time.time() < deadline:
                message = pubsub.get_message(timeout=1)
                if message and message["type"] == "message":
                    data = message["data"]
                    if isinstance(data, bytes):
                        data = data.decode()

                    if data != "1":
                        # Error occurred
                        error_data = json.loads(data)
                        raise Exception(error_data.get("error", "Unknown error"))

                    # Get result
                    result = self.redis.get(result_key)
                    if result:
                        return json.loads(result)

            raise TimeoutError("Request coalescing timeout")

        finally:
            pubsub.unsubscribe()
            pubsub.close()

# Usage with gateway
class CoalescingGateway:
    def __init__(self, redis_client: redis.Redis, cache: GatewayCache):
        self.coalescer = RequestCoalescer(redis_client)
        self.cache = cache

    def forward_request(self, method: str, path: str,
                        query_params: Dict, headers: Dict,
                        backend_call: Callable) -> Dict:
        """Forward request with coalescing."""
        # Generate coalescing key
        key_parts = [method, path, str(sorted(query_params.items()))]
        coalesce_key = hashlib.sha256(
            "|".join(key_parts).encode()
        ).hexdigest()[:16]

        def execute():
            # Make actual backend call
            return backend_call()

        return self.coalescer.execute_or_wait(coalesce_key, execute)
```

## Pattern 3: Response Aggregation Caching

Cache aggregated responses from multiple services:

```python
import redis
import json
import hashlib
import asyncio
import aiohttp
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class ServiceCall:
    service: str
    endpoint: str
    method: str = "GET"
    params: Dict = None
    body: Any = None
    cache_ttl: int = 300

@dataclass
class AggregatedResponse:
    results: Dict[str, Any]
    partial: bool
    errors: Dict[str, str]

class ResponseAggregator:
    def __init__(self, redis_client: redis.Redis,
                 service_urls: Dict[str, str]):
        self.redis = redis_client
        self.service_urls = service_urls
        self._prefix = "gateway:aggregate"

    def _cache_key(self, call: ServiceCall) -> str:
        """Generate cache key for service call."""
        key_parts = [
            call.service,
            call.endpoint,
            call.method,
            str(call.params or {})
        ]
        key_hash = hashlib.sha256(
            "|".join(key_parts).encode()
        ).hexdigest()[:24]
        return f"{self._prefix}:{key_hash}"

    async def _call_service(self, session: aiohttp.ClientSession,
                           call: ServiceCall) -> tuple:
        """Call a single service."""
        cache_key = self._cache_key(call)

        # Check cache
        cached = self.redis.get(cache_key)
        if cached:
            logger.debug(f"Cache hit for {call.service}:{call.endpoint}")
            return call.service, json.loads(cached), None

        # Make request
        url = f"{self.service_urls[call.service]}{call.endpoint}"

        try:
            async with session.request(
                call.method,
                url,
                params=call.params,
                json=call.body,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status == 200:
                    data = await response.json()

                    # Cache successful response
                    self.redis.setex(
                        cache_key,
                        call.cache_ttl,
                        json.dumps(data)
                    )

                    return call.service, data, None
                else:
                    return call.service, None, f"HTTP {response.status}"

        except Exception as e:
            logger.error(f"Error calling {call.service}: {e}")
            return call.service, None, str(e)

    async def aggregate(self, calls: List[ServiceCall],
                       allow_partial: bool = True) -> AggregatedResponse:
        """Aggregate responses from multiple services."""
        async with aiohttp.ClientSession() as session:
            tasks = [self._call_service(session, call) for call in calls]
            results = await asyncio.gather(*tasks)

        aggregated = {}
        errors = {}

        for service, data, error in results:
            if data is not None:
                aggregated[service] = data
            elif error:
                errors[service] = error

        partial = len(errors) > 0 and len(aggregated) > 0

        if not allow_partial and errors:
            raise AggregationError(errors)

        return AggregatedResponse(
            results=aggregated,
            partial=partial,
            errors=errors
        )

    def aggregate_sync(self, calls: List[ServiceCall],
                       allow_partial: bool = True) -> AggregatedResponse:
        """Synchronous wrapper for aggregate."""
        return asyncio.run(self.aggregate(calls, allow_partial))

class AggregationError(Exception):
    def __init__(self, errors: Dict[str, str]):
        self.errors = errors
        super().__init__(f"Aggregation failed: {errors}")

# Usage
r = redis.Redis()
service_urls = {
    "users": "http://user-service:8080",
    "orders": "http://order-service:8080",
    "products": "http://product-service:8080"
}

aggregator = ResponseAggregator(r, service_urls)

# Aggregate user profile data
calls = [
    ServiceCall("users", "/users/123", cache_ttl=300),
    ServiceCall("orders", "/orders?user_id=123", cache_ttl=60),
    ServiceCall("products", "/products/recommended?user_id=123", cache_ttl=120)
]

response = aggregator.aggregate_sync(calls)
# response.results contains data from all services
```

## Pattern 4: Stale-While-Revalidate

Serve stale content while refreshing in background:

```python
import redis
import json
import time
import threading
from typing import Dict, Any, Callable, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class SWRCacheEntry:
    data: Any
    cached_at: float
    ttl: int
    stale_ttl: int

class StaleWhileRevalidateCache:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self._prefix = "gateway:swr"
        self._revalidating: set = set()

    def _data_key(self, key: str) -> str:
        return f"{self._prefix}:data:{key}"

    def _meta_key(self, key: str) -> str:
        return f"{self._prefix}:meta:{key}"

    def get(self, key: str, fetcher: Callable[[], Any],
            ttl: int = 300, stale_ttl: int = 3600) -> tuple:
        """Get value with stale-while-revalidate."""
        data_key = self._data_key(key)
        meta_key = self._meta_key(key)

        # Get cached data and metadata
        pipe = self.redis.pipeline()
        pipe.get(data_key)
        pipe.get(meta_key)
        data, meta = pipe.execute()

        now = time.time()

        if data and meta:
            cached_data = json.loads(data)
            cached_meta = json.loads(meta)
            age = now - cached_meta["cached_at"]

            if age < ttl:
                # Fresh - return immediately
                return cached_data, "fresh"

            elif age < stale_ttl:
                # Stale but usable - return and revalidate
                self._background_revalidate(key, fetcher, ttl, stale_ttl)
                return cached_data, "stale"

        # No cache or expired - fetch synchronously
        try:
            fresh_data = fetcher()
            self._store(key, fresh_data, ttl, stale_ttl)
            return fresh_data, "miss"
        except Exception as e:
            # If we have stale data, return it on error
            if data:
                logger.warning(f"Fetch failed, returning stale: {e}")
                return json.loads(data), "stale-error"
            raise

    def _store(self, key: str, data: Any, ttl: int, stale_ttl: int):
        """Store data with metadata."""
        data_key = self._data_key(key)
        meta_key = self._meta_key(key)
        now = time.time()

        pipe = self.redis.pipeline()
        pipe.setex(data_key, stale_ttl, json.dumps(data))
        pipe.setex(meta_key, stale_ttl, json.dumps({
            "cached_at": now,
            "ttl": ttl,
            "stale_ttl": stale_ttl
        }))
        pipe.execute()

    def _background_revalidate(self, key: str, fetcher: Callable,
                               ttl: int, stale_ttl: int):
        """Revalidate in background."""
        if key in self._revalidating:
            return  # Already revalidating

        self._revalidating.add(key)

        def revalidate():
            try:
                fresh_data = fetcher()
                self._store(key, fresh_data, ttl, stale_ttl)
                logger.debug(f"Revalidated cache: {key}")
            except Exception as e:
                logger.error(f"Background revalidation failed: {e}")
            finally:
                self._revalidating.discard(key)

        thread = threading.Thread(target=revalidate)
        thread.daemon = True
        thread.start()

# Usage
swr_cache = StaleWhileRevalidateCache(redis.Redis())

def fetch_user_data(user_id: str):
    # Make API call
    response = requests.get(f"http://user-service/users/{user_id}")
    return response.json()

# Get with SWR semantics
data, status = swr_cache.get(
    f"user:123",
    lambda: fetch_user_data("123"),
    ttl=60,        # Fresh for 60 seconds
    stale_ttl=3600  # Usable while stale for 1 hour
)
```

## Pattern 5: Cache Tags for Invalidation

Implement tag-based cache invalidation:

```python
import redis
import json
from typing import Dict, Any, List, Set
import logging

logger = logging.getLogger(__name__)

class TaggedCache:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self._prefix = "gateway:tagged"

    def _cache_key(self, key: str) -> str:
        return f"{self._prefix}:data:{key}"

    def _tag_key(self, tag: str) -> str:
        return f"{self._prefix}:tag:{tag}"

    def set(self, key: str, value: Any, tags: List[str],
            ttl: int = 300):
        """Set cache value with tags."""
        cache_key = self._cache_key(key)

        pipe = self.redis.pipeline()

        # Store value
        pipe.setex(cache_key, ttl, json.dumps(value))

        # Associate with tags
        for tag in tags:
            tag_key = self._tag_key(tag)
            pipe.sadd(tag_key, key)
            pipe.expire(tag_key, ttl * 2)  # Tags live longer than data

        pipe.execute()

    def get(self, key: str) -> Any:
        """Get cached value."""
        cache_key = self._cache_key(key)
        data = self.redis.get(cache_key)
        if data:
            return json.loads(data)
        return None

    def invalidate_tag(self, tag: str) -> int:
        """Invalidate all entries with tag."""
        tag_key = self._tag_key(tag)
        keys = self.redis.smembers(tag_key)

        if not keys:
            return 0

        cache_keys = [self._cache_key(k.decode() if isinstance(k, bytes) else k)
                      for k in keys]

        pipe = self.redis.pipeline()
        pipe.delete(*cache_keys)
        pipe.delete(tag_key)
        pipe.execute()

        count = len(cache_keys)
        logger.info(f"Invalidated {count} entries with tag: {tag}")
        return count

    def invalidate_tags(self, tags: List[str]) -> int:
        """Invalidate entries with any of the tags."""
        total = 0
        for tag in tags:
            total += self.invalidate_tag(tag)
        return total

# Usage example
cache = TaggedCache(redis.Redis())

# Cache user data with tags
cache.set(
    "user:123:profile",
    {"id": 123, "name": "John"},
    tags=["user:123", "profiles"],
    ttl=300
)

cache.set(
    "user:123:orders",
    [{"id": 1, "total": 100}],
    tags=["user:123", "orders"],
    ttl=60
)

# Invalidate all user:123 data on update
cache.invalidate_tag("user:123")

# Invalidate all profiles
cache.invalidate_tag("profiles")
```

## Best Practices

1. **Use appropriate TTLs** - Balance freshness with backend load
2. **Implement cache warming** - Pre-populate cache for popular endpoints
3. **Handle cache failures gracefully** - Fall back to backend on Redis errors
4. **Monitor cache hit rates** - Track effectiveness and adjust TTLs
5. **Use compression** - For large responses
6. **Implement request coalescing** - Prevent thundering herd
7. **Tag-based invalidation** - Efficiently invalidate related entries

## Conclusion

Redis-based API gateway caching significantly improves performance and reliability. Implement appropriate caching strategies based on your consistency requirements and traffic patterns. The combination of response caching, request coalescing, and stale-while-revalidate patterns provides a robust caching layer that handles both normal operations and failure scenarios gracefully.
