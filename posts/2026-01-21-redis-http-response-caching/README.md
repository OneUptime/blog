# How to Implement HTTP Response Caching with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Caching, HTTP, API, REST, Performance, Python, Node.js, FastAPI, Express

Description: A comprehensive guide to implementing HTTP response caching with Redis for APIs. Learn cache invalidation strategies, ETags, cache headers, and practical middleware implementations.

---

> API response caching is one of the most effective ways to improve application performance. By caching responses in Redis, you can reduce database load, decrease response times, and handle more concurrent requests without scaling your infrastructure.

HTTP response caching stores the complete API response, enabling subsequent requests to be served directly from cache without executing any business logic or database queries.

---

## Why Cache HTTP Responses?

### Performance Impact

```
Without caching:
Client -> API -> Business Logic -> Database -> API -> Client
Total time: ~100-500ms

With Redis caching:
Client -> API -> Redis Cache -> Client
Total time: ~1-5ms
```

### Benefits

- **Reduced latency**: Serve responses in milliseconds
- **Lower database load**: Fewer queries hit your database
- **Higher throughput**: Handle more requests with same infrastructure
- **Cost savings**: Reduce compute and database costs

---

## Basic Response Caching

### Python with FastAPI

```python
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
import redis
import json
import hashlib
from typing import Optional
from functools import wraps

app = FastAPI()
redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def cache_response(ttl: int = 300, key_prefix: str = "api"):
    """
    Decorator to cache API responses in Redis.

    Args:
        ttl: Time-to-live in seconds
        key_prefix: Prefix for cache keys
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            # Build cache key from request
            cache_key = build_cache_key(request, key_prefix)

            # Try to get from cache
            cached = redis_client.get(cache_key)
            if cached:
                data = json.loads(cached)
                return JSONResponse(
                    content=data['body'],
                    status_code=data['status_code'],
                    headers={'X-Cache': 'HIT'}
                )

            # Execute endpoint
            response = await func(request, *args, **kwargs)

            # Cache the response
            if response.status_code == 200:
                cache_data = {
                    'body': response.body.decode() if hasattr(response, 'body') else response,
                    'status_code': response.status_code
                }
                redis_client.setex(cache_key, ttl, json.dumps(cache_data))

            return response

        return wrapper
    return decorator

def build_cache_key(request: Request, prefix: str) -> str:
    """Build cache key from request path and query params"""
    # Include path and sorted query params
    path = request.url.path
    query = str(sorted(request.query_params.items()))

    # Hash for consistent key length
    key_data = f"{path}:{query}"
    key_hash = hashlib.md5(key_data.encode()).hexdigest()

    return f"{prefix}:{key_hash}"

# Usage
@app.get("/api/products")
@cache_response(ttl=300)
async def get_products(request: Request):
    # This will only execute on cache miss
    products = await fetch_products_from_database()
    return JSONResponse(content=products)

@app.get("/api/products/{product_id}")
@cache_response(ttl=600)
async def get_product(request: Request, product_id: int):
    product = await fetch_product_from_database(product_id)
    return JSONResponse(content=product)
```

### Node.js with Express

```javascript
const express = require('express');
const redis = require('redis');
const crypto = require('crypto');

const app = express();
const client = redis.createClient();
await client.connect();

/**
 * Middleware to cache responses in Redis
 */
function cacheResponse(options = {}) {
    const {
        ttl = 300,
        keyPrefix = 'api',
        condition = () => true,  // Function to determine if response should be cached
        keyBuilder = defaultKeyBuilder
    } = options;

    return async (req, res, next) => {
        // Skip caching for non-GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const cacheKey = keyBuilder(req, keyPrefix);

        try {
            // Check cache
            const cached = await client.get(cacheKey);

            if (cached) {
                const data = JSON.parse(cached);
                res.set('X-Cache', 'HIT');
                res.set('X-Cache-Key', cacheKey);
                return res.status(data.statusCode).json(data.body);
            }
        } catch (err) {
            console.error('Cache read error:', err);
        }

        // Store original json method
        const originalJson = res.json.bind(res);

        // Override json method to intercept response
        res.json = async (body) => {
            // Cache successful responses
            if (res.statusCode === 200 && condition(req, res, body)) {
                try {
                    await client.setEx(cacheKey, ttl, JSON.stringify({
                        body,
                        statusCode: res.statusCode
                    }));
                } catch (err) {
                    console.error('Cache write error:', err);
                }
            }

            res.set('X-Cache', 'MISS');
            return originalJson(body);
        };

        next();
    };
}

function defaultKeyBuilder(req, prefix) {
    const path = req.path;
    const query = JSON.stringify(Object.keys(req.query).sort().reduce((obj, key) => {
        obj[key] = req.query[key];
        return obj;
    }, {}));

    const hash = crypto.createHash('md5')
        .update(`${path}:${query}`)
        .digest('hex');

    return `${prefix}:${hash}`;
}

// Usage
app.get('/api/products',
    cacheResponse({ ttl: 300 }),
    async (req, res) => {
        const products = await fetchProductsFromDatabase();
        res.json(products);
    }
);

// Cache with custom key builder
app.get('/api/users/:id',
    cacheResponse({
        ttl: 600,
        keyBuilder: (req, prefix) => `${prefix}:user:${req.params.id}`
    }),
    async (req, res) => {
        const user = await fetchUserFromDatabase(req.params.id);
        res.json(user);
    }
);
```

---

## Advanced Caching Strategies

### User-Specific Caching

```python
from fastapi import FastAPI, Request, Depends
from fastapi.security import HTTPBearer

security = HTTPBearer()

def cache_response_per_user(ttl: int = 300):
    """Cache responses per user"""
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            # Get user identifier from token
            user_id = get_user_id_from_request(request)

            # Build user-specific cache key
            cache_key = f"api:user:{user_id}:{request.url.path}"

            cached = redis_client.get(cache_key)
            if cached:
                return JSONResponse(
                    content=json.loads(cached),
                    headers={'X-Cache': 'HIT'}
                )

            response = await func(request, *args, **kwargs)

            if response.status_code == 200:
                redis_client.setex(cache_key, ttl, json.dumps(response.body))

            return response

        return wrapper
    return decorator

@app.get("/api/dashboard")
@cache_response_per_user(ttl=60)
async def get_dashboard(request: Request):
    user_id = get_user_id_from_request(request)
    dashboard_data = await fetch_user_dashboard(user_id)
    return JSONResponse(content=dashboard_data)
```

### Vary-Based Caching

```python
def cache_with_vary(ttl: int = 300, vary_headers: list = None):
    """
    Cache responses with Vary header support.
    Different cached versions for different header values.
    """
    vary_headers = vary_headers or ['Accept-Language', 'Accept-Encoding']

    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            # Build cache key including vary headers
            vary_values = [
                request.headers.get(h, '') for h in vary_headers
            ]
            vary_key = ':'.join(vary_values)

            cache_key = f"api:{request.url.path}:{hashlib.md5(vary_key.encode()).hexdigest()}"

            cached = redis_client.get(cache_key)
            if cached:
                response = JSONResponse(
                    content=json.loads(cached),
                    headers={
                        'X-Cache': 'HIT',
                        'Vary': ', '.join(vary_headers)
                    }
                )
                return response

            response = await func(request, *args, **kwargs)

            if response.status_code == 200:
                redis_client.setex(cache_key, ttl, json.dumps(response.body))

            response.headers['Vary'] = ', '.join(vary_headers)
            return response

        return wrapper
    return decorator

@app.get("/api/content")
@cache_with_vary(ttl=300, vary_headers=['Accept-Language'])
async def get_content(request: Request):
    language = request.headers.get('Accept-Language', 'en')
    content = await fetch_localized_content(language)
    return JSONResponse(content=content)
```

---

## Cache Invalidation

### Tag-Based Invalidation

```python
class TaggedCache:
    """Cache with tag-based invalidation"""

    def __init__(self, redis_client):
        self.redis = redis_client

    def set(self, key: str, value: str, ttl: int, tags: list = None):
        """Set cache with tags"""
        # Store the value
        self.redis.setex(key, ttl, value)

        # Associate key with tags
        if tags:
            for tag in tags:
                self.redis.sadd(f"tag:{tag}", key)
                self.redis.expire(f"tag:{tag}", ttl)

    def get(self, key: str) -> Optional[str]:
        """Get cached value"""
        return self.redis.get(key)

    def invalidate_by_tag(self, tag: str):
        """Invalidate all keys with a specific tag"""
        tag_key = f"tag:{tag}"
        keys = self.redis.smembers(tag_key)

        if keys:
            self.redis.delete(*keys)
        self.redis.delete(tag_key)

    def invalidate_by_tags(self, tags: list):
        """Invalidate all keys with any of the specified tags"""
        for tag in tags:
            self.invalidate_by_tag(tag)

cache = TaggedCache(redis_client)

# Cache product list with tags
@app.get("/api/products")
async def get_products(request: Request):
    cache_key = "api:products"
    cached = cache.get(cache_key)

    if cached:
        return JSONResponse(content=json.loads(cached))

    products = await fetch_products()

    # Cache with tags for invalidation
    cache.set(
        cache_key,
        json.dumps(products),
        ttl=300,
        tags=['products', 'catalog']
    )

    return JSONResponse(content=products)

# Invalidate on product update
@app.put("/api/products/{product_id}")
async def update_product(product_id: int, data: dict):
    await update_product_in_database(product_id, data)

    # Invalidate related caches
    cache.invalidate_by_tags(['products', f'product:{product_id}'])

    return {"status": "updated"}
```

### Event-Driven Invalidation

```python
import redis.asyncio as aioredis

class CacheInvalidator:
    """Event-driven cache invalidation using Redis Pub/Sub"""

    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.pubsub = None

    async def publish_invalidation(self, event_type: str, entity_id: str):
        """Publish cache invalidation event"""
        redis = await aioredis.from_url(self.redis_url)
        await redis.publish(
            'cache_invalidation',
            json.dumps({
                'event': event_type,
                'entity_id': entity_id,
                'timestamp': time.time()
            })
        )
        await redis.close()

    async def subscribe_invalidations(self, handler):
        """Subscribe to cache invalidation events"""
        redis = await aioredis.from_url(self.redis_url)
        self.pubsub = redis.pubsub()
        await self.pubsub.subscribe('cache_invalidation')

        async for message in self.pubsub.listen():
            if message['type'] == 'message':
                data = json.loads(message['data'])
                await handler(data)

invalidator = CacheInvalidator('redis://localhost:6379')

# Handler for invalidation events
async def handle_invalidation(event):
    event_type = event['event']
    entity_id = event['entity_id']

    if event_type == 'product_updated':
        keys_to_delete = [
            f"api:product:{entity_id}",
            "api:products",
            "api:catalog"
        ]
        redis_client.delete(*keys_to_delete)

    elif event_type == 'user_updated':
        # Invalidate user-specific caches
        pattern = f"api:user:{entity_id}:*"
        cursor = 0
        while True:
            cursor, keys = redis_client.scan(cursor, match=pattern)
            if keys:
                redis_client.delete(*keys)
            if cursor == 0:
                break

# Start subscriber in background task
asyncio.create_task(invalidator.subscribe_invalidations(handle_invalidation))

# Publish invalidation on update
@app.put("/api/products/{product_id}")
async def update_product(product_id: int, data: dict):
    await update_product_in_database(product_id, data)
    await invalidator.publish_invalidation('product_updated', str(product_id))
    return {"status": "updated"}
```

---

## HTTP Cache Headers

### Implementing ETags

```python
import hashlib

def generate_etag(content: str) -> str:
    """Generate ETag from content"""
    return f'"{hashlib.md5(content.encode()).hexdigest()}"'

@app.get("/api/products/{product_id}")
async def get_product(request: Request, product_id: int):
    # Get cached response with ETag
    cache_key = f"api:product:{product_id}"
    cached = redis_client.hgetall(cache_key)

    if cached:
        etag = cached.get('etag')
        body = cached.get('body')

        # Check If-None-Match header
        if_none_match = request.headers.get('If-None-Match')
        if if_none_match == etag:
            return Response(status_code=304)  # Not Modified

        return JSONResponse(
            content=json.loads(body),
            headers={
                'ETag': etag,
                'Cache-Control': 'private, max-age=300',
                'X-Cache': 'HIT'
            }
        )

    # Fetch from database
    product = await fetch_product(product_id)
    body = json.dumps(product)
    etag = generate_etag(body)

    # Store with ETag
    redis_client.hset(cache_key, mapping={
        'body': body,
        'etag': etag
    })
    redis_client.expire(cache_key, 300)

    return JSONResponse(
        content=product,
        headers={
            'ETag': etag,
            'Cache-Control': 'private, max-age=300',
            'X-Cache': 'MISS'
        }
    )
```

### Cache-Control Headers

```python
from enum import Enum

class CacheScope(Enum):
    PUBLIC = "public"      # Can be cached by CDN/proxies
    PRIVATE = "private"    # Only cache in browser
    NO_STORE = "no-store"  # Don't cache at all

def cache_control_response(
    ttl: int,
    scope: CacheScope = CacheScope.PRIVATE,
    must_revalidate: bool = False,
    stale_while_revalidate: int = 0
):
    """Decorator to add Cache-Control headers"""
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            response = await func(request, *args, **kwargs)

            # Build Cache-Control header
            directives = [scope.value, f"max-age={ttl}"]

            if must_revalidate:
                directives.append("must-revalidate")

            if stale_while_revalidate > 0:
                directives.append(f"stale-while-revalidate={stale_while_revalidate}")

            response.headers['Cache-Control'] = ', '.join(directives)

            return response

        return wrapper
    return decorator

# Public cacheable content (can be cached by CDN)
@app.get("/api/public/products")
@cache_control_response(ttl=3600, scope=CacheScope.PUBLIC)
async def get_public_products(request: Request):
    return JSONResponse(content=await fetch_products())

# Private user data (browser cache only)
@app.get("/api/user/profile")
@cache_control_response(
    ttl=60,
    scope=CacheScope.PRIVATE,
    must_revalidate=True
)
async def get_user_profile(request: Request):
    return JSONResponse(content=await fetch_user_profile())

# Stale-while-revalidate for better UX
@app.get("/api/feed")
@cache_control_response(
    ttl=60,
    scope=CacheScope.PRIVATE,
    stale_while_revalidate=300  # Serve stale for 5 min while revalidating
)
async def get_feed(request: Request):
    return JSONResponse(content=await fetch_feed())
```

---

## Monitoring Cache Performance

```python
from prometheus_client import Counter, Histogram, Gauge

# Metrics
cache_requests = Counter(
    'http_cache_requests_total',
    'Cache requests',
    ['endpoint', 'status']  # HIT, MISS
)

cache_latency = Histogram(
    'http_cache_latency_seconds',
    'Cache operation latency',
    ['operation']  # get, set
)

cache_size = Gauge(
    'http_cache_entries',
    'Number of cached entries'
)

def instrumented_cache_response(ttl: int = 300):
    """Cache decorator with metrics"""
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            endpoint = request.url.path
            cache_key = build_cache_key(request, "api")

            # Check cache with timing
            with cache_latency.labels(operation='get').time():
                cached = redis_client.get(cache_key)

            if cached:
                cache_requests.labels(endpoint=endpoint, status='HIT').inc()
                return JSONResponse(
                    content=json.loads(cached),
                    headers={'X-Cache': 'HIT'}
                )

            cache_requests.labels(endpoint=endpoint, status='MISS').inc()

            response = await func(request, *args, **kwargs)

            if response.status_code == 200:
                with cache_latency.labels(operation='set').time():
                    redis_client.setex(cache_key, ttl, json.dumps(response.body))

            return response

        return wrapper
    return decorator
```

---

## Best Practices

### 1. Choose Appropriate TTLs

```python
CACHE_TTLS = {
    'static_content': 86400,     # 24 hours - rarely changes
    'product_catalog': 3600,     # 1 hour - changes occasionally
    'search_results': 300,       # 5 minutes - changes frequently
    'user_feed': 60,             # 1 minute - highly dynamic
    'real_time_data': 10,        # 10 seconds - near real-time
}
```

### 2. Handle Cache Failures Gracefully

```python
def cache_response_resilient(ttl: int = 300):
    """Cache with graceful degradation"""
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            cache_key = build_cache_key(request, "api")

            try:
                cached = redis_client.get(cache_key)
                if cached:
                    return JSONResponse(content=json.loads(cached))
            except redis.RedisError:
                # Cache unavailable - continue without cache
                pass

            response = await func(request, *args, **kwargs)

            try:
                if response.status_code == 200:
                    redis_client.setex(cache_key, ttl, json.dumps(response.body))
            except redis.RedisError:
                pass  # Cache unavailable - continue without caching

            return response

        return wrapper
    return decorator
```

### 3. Version Your Cache Keys

```python
CACHE_VERSION = "v2"  # Increment when cache format changes

def build_versioned_cache_key(request: Request, prefix: str) -> str:
    base_key = build_cache_key(request, prefix)
    return f"{CACHE_VERSION}:{base_key}"
```

---

## Conclusion

HTTP response caching with Redis can dramatically improve API performance:

- **Reduce latency** from hundreds of milliseconds to single-digit milliseconds
- **Lower database load** by serving repeated requests from cache
- **Scale better** by handling more requests with the same infrastructure

Key takeaways:
- Use appropriate TTLs for different content types
- Implement robust cache invalidation strategies
- Add proper HTTP cache headers for browser and CDN caching
- Monitor cache hit rates and performance

---

*Need to monitor your API caching layer? [OneUptime](https://oneuptime.com) provides comprehensive API monitoring with cache hit ratio tracking, latency alerts, and performance dashboards.*
