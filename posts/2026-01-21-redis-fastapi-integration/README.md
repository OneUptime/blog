# How to Integrate Redis with FastAPI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, FastAPI, Python, Async, Caching, Sessions, Dependency Injection

Description: A comprehensive guide to integrating Redis with FastAPI applications using async clients, covering caching, session management, rate limiting, and dependency injection patterns.

---

FastAPI's async-first design pairs perfectly with Redis for high-performance caching, session management, and real-time features. This guide covers async Redis integration using aioredis/redis-py with practical patterns for production applications.

## Installation

```bash
pip install fastapi redis[hiredis] uvicorn python-jose[cryptography]
```

## Redis Client Setup

### Async Redis Connection

```python
# app/core/redis.py
from redis.asyncio import Redis, ConnectionPool
from contextlib import asynccontextmanager
import os

class RedisClient:
    def __init__(self):
        self.pool: ConnectionPool = None
        self.client: Redis = None

    async def connect(self):
        self.pool = ConnectionPool.from_url(
            os.getenv("REDIS_URL", "redis://localhost:6379"),
            max_connections=50,
            decode_responses=True
        )
        self.client = Redis(connection_pool=self.pool)

    async def disconnect(self):
        if self.client:
            await self.client.close()
        if self.pool:
            await self.pool.disconnect()

    def get_client(self) -> Redis:
        return self.client

redis_client = RedisClient()

# Lifespan context manager
@asynccontextmanager
async def lifespan(app):
    await redis_client.connect()
    yield
    await redis_client.disconnect()
```

### FastAPI Application Setup

```python
# app/main.py
from fastapi import FastAPI
from app.core.redis import lifespan

app = FastAPI(lifespan=lifespan)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

## Dependency Injection

### Redis Dependency

```python
# app/dependencies.py
from fastapi import Depends
from redis.asyncio import Redis
from app.core.redis import redis_client

async def get_redis() -> Redis:
    return redis_client.get_client()

# Usage in routes
from fastapi import APIRouter

router = APIRouter()

@router.get("/cache/{key}")
async def get_cached_value(key: str, redis: Redis = Depends(get_redis)):
    value = await redis.get(key)
    return {"key": key, "value": value}
```

## Caching Layer

### Cache Service

```python
# app/services/cache.py
from redis.asyncio import Redis
from typing import Any, Optional, Callable, TypeVar
import json
from functools import wraps

T = TypeVar('T')

class CacheService:
    def __init__(self, redis: Redis, prefix: str = "cache"):
        self.redis = redis
        self.prefix = prefix

    def _key(self, name: str) -> str:
        return f"{self.prefix}:{name}"

    async def get(self, key: str) -> Optional[Any]:
        data = await self.redis.get(self._key(key))
        if data:
            return json.loads(data)
        return None

    async def set(
        self,
        key: str,
        value: Any,
        ttl: int = 300
    ) -> None:
        await self.redis.setex(
            self._key(key),
            ttl,
            json.dumps(value, default=str)
        )

    async def delete(self, key: str) -> None:
        await self.redis.delete(self._key(key))

    async def exists(self, key: str) -> bool:
        return await self.redis.exists(self._key(key)) > 0

    async def remember(
        self,
        key: str,
        ttl: int,
        callback: Callable[[], T]
    ) -> T:
        cached = await self.get(key)
        if cached is not None:
            return cached

        result = await callback() if asyncio.iscoroutinefunction(callback) else callback()
        await self.set(key, result, ttl)
        return result

    async def flush_pattern(self, pattern: str) -> int:
        cursor = 0
        deleted = 0
        while True:
            cursor, keys = await self.redis.scan(
                cursor,
                match=self._key(pattern),
                count=100
            )
            if keys:
                deleted += await self.redis.delete(*keys)
            if cursor == 0:
                break
        return deleted
```

### Cache Dependency

```python
# app/dependencies.py
from app.services.cache import CacheService

async def get_cache(redis: Redis = Depends(get_redis)) -> CacheService:
    return CacheService(redis)
```

### Using Cache in Routes

```python
# app/routers/products.py
from fastapi import APIRouter, Depends
from app.dependencies import get_cache
from app.services.cache import CacheService
from app.models import Product

router = APIRouter()

@router.get("/products")
async def get_products(cache: CacheService = Depends(get_cache)):
    async def fetch_products():
        # Expensive database query
        return await Product.find_all()

    products = await cache.remember("products:all", 600, fetch_products)
    return {"products": products}

@router.get("/products/{product_id}")
async def get_product(
    product_id: int,
    cache: CacheService = Depends(get_cache)
):
    async def fetch_product():
        return await Product.find_by_id(product_id)

    product = await cache.remember(f"product:{product_id}", 300, fetch_product)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.put("/products/{product_id}")
async def update_product(
    product_id: int,
    data: ProductUpdate,
    cache: CacheService = Depends(get_cache)
):
    await Product.update(product_id, data)

    # Invalidate cache
    await cache.delete(f"product:{product_id}")
    await cache.flush_pattern("products:*")

    return {"message": "Product updated"}
```

### Caching Decorator

```python
# app/decorators/cache.py
from functools import wraps
from typing import Callable, Optional
import hashlib
import json

def cached(
    ttl: int = 300,
    key_prefix: Optional[str] = None,
    key_builder: Optional[Callable] = None
):
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get cache from kwargs or use global
            cache = kwargs.get('cache') or get_global_cache()

            # Build cache key
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                prefix = key_prefix or func.__name__
                key_data = json.dumps({"args": args[1:], "kwargs": kwargs}, default=str)
                key_hash = hashlib.md5(key_data.encode()).hexdigest()
                cache_key = f"{prefix}:{key_hash}"

            # Check cache
            cached_value = await cache.get(cache_key)
            if cached_value is not None:
                return cached_value

            # Execute function
            result = await func(*args, **kwargs)

            # Store in cache
            await cache.set(cache_key, result, ttl)

            return result
        return wrapper
    return decorator

# Usage
class ProductService:
    def __init__(self, cache: CacheService):
        self.cache = cache

    @cached(ttl=300, key_prefix="product")
    async def get_product(self, product_id: int):
        return await Product.find_by_id(product_id)
```

## Session Management

### JWT with Redis Blacklist

```python
# app/services/auth.py
from redis.asyncio import Redis
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import os

class AuthService:
    def __init__(self, redis: Redis):
        self.redis = redis
        self.secret_key = os.getenv("SECRET_KEY")
        self.algorithm = "HS256"
        self.access_token_expire = 30  # minutes
        self.refresh_token_expire = 7  # days

    def create_access_token(self, user_id: int) -> str:
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire)
        payload = {
            "sub": str(user_id),
            "exp": expire,
            "type": "access"
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)

    def create_refresh_token(self, user_id: int) -> str:
        expire = datetime.utcnow() + timedelta(days=self.refresh_token_expire)
        payload = {
            "sub": str(user_id),
            "exp": expire,
            "type": "refresh"
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)

    async def verify_token(self, token: str) -> Optional[int]:
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])

            # Check if token is blacklisted
            if await self.is_token_blacklisted(token):
                return None

            return int(payload.get("sub"))
        except JWTError:
            return None

    async def blacklist_token(self, token: str):
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            exp = payload.get("exp")
            ttl = exp - datetime.utcnow().timestamp()
            if ttl > 0:
                await self.redis.setex(f"blacklist:{token}", int(ttl), "1")
        except JWTError:
            pass

    async def is_token_blacklisted(self, token: str) -> bool:
        return await self.redis.exists(f"blacklist:{token}") > 0

    async def store_user_session(self, user_id: int, session_data: dict):
        key = f"session:{user_id}"
        await self.redis.hset(key, mapping=session_data)
        await self.redis.expire(key, self.access_token_expire * 60)

    async def get_user_session(self, user_id: int) -> Optional[dict]:
        key = f"session:{user_id}"
        return await self.redis.hgetall(key)
```

### Auth Dependency

```python
# app/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.services.auth import AuthService

security = HTTPBearer()

async def get_auth_service(redis: Redis = Depends(get_redis)) -> AuthService:
    return AuthService(redis)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_service: AuthService = Depends(get_auth_service)
) -> int:
    token = credentials.credentials
    user_id = await auth_service.verify_token(token)

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    return user_id
```

### Auth Routes

```python
# app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_auth_service, get_current_user
from app.services.auth import AuthService

router = APIRouter()

@router.post("/login")
async def login(
    credentials: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    user = await authenticate_user(credentials.username, credentials.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = auth_service.create_access_token(user.id)
    refresh_token = auth_service.create_refresh_token(user.id)

    # Store session
    await auth_service.store_user_session(user.id, {
        "username": user.username,
        "email": user.email
    })

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/logout")
async def logout(
    user_id: int = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_service: AuthService = Depends(get_auth_service)
):
    await auth_service.blacklist_token(credentials.credentials)
    return {"message": "Logged out"}
```

## Rate Limiting

### Rate Limiter Service

```python
# app/services/rate_limiter.py
from redis.asyncio import Redis
import time

class RateLimiter:
    def __init__(self, redis: Redis):
        self.redis = redis

    async def is_allowed(
        self,
        key: str,
        limit: int,
        window: int
    ) -> tuple[bool, int, int]:
        """
        Sliding window rate limiter.
        Returns (is_allowed, remaining, reset_time)
        """
        now = time.time()
        window_start = now - window

        pipe = self.redis.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zadd(key, {str(now): now})
        pipe.zcard(key)
        pipe.expire(key, window)

        results = await pipe.execute()
        current_count = results[2]

        remaining = max(0, limit - current_count)
        reset_time = int(now + window)

        return current_count <= limit, remaining, reset_time

    async def check_rate_limit(
        self,
        identifier: str,
        limit: int = 100,
        window: int = 60
    ) -> dict:
        key = f"ratelimit:{identifier}"
        allowed, remaining, reset_time = await self.is_allowed(key, limit, window)

        return {
            "allowed": allowed,
            "limit": limit,
            "remaining": remaining,
            "reset": reset_time
        }
```

### Rate Limit Middleware

```python
# app/middleware/rate_limit.py
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.redis import redis_client
from app.services.rate_limiter import RateLimiter

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, limit: int = 100, window: int = 60):
        super().__init__(app)
        self.limit = limit
        self.window = window

    async def dispatch(self, request: Request, call_next):
        # Get client identifier
        client_ip = request.client.host
        user_id = getattr(request.state, 'user_id', None)
        identifier = f"{user_id or 'anon'}:{client_ip}"

        # Check rate limit
        limiter = RateLimiter(redis_client.get_client())
        result = await limiter.check_rate_limit(
            identifier,
            self.limit,
            self.window
        )

        # Add headers
        response = await call_next(request) if result["allowed"] else None

        if response:
            response.headers["X-RateLimit-Limit"] = str(result["limit"])
            response.headers["X-RateLimit-Remaining"] = str(result["remaining"])
            response.headers["X-RateLimit-Reset"] = str(result["reset"])
            return response

        raise HTTPException(
            status_code=429,
            detail="Too many requests",
            headers={
                "X-RateLimit-Limit": str(result["limit"]),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(result["reset"]),
                "Retry-After": str(result["reset"] - int(time.time()))
            }
        )
```

### Rate Limit Dependency

```python
# app/dependencies.py
from fastapi import Request, HTTPException

async def rate_limit(
    request: Request,
    redis: Redis = Depends(get_redis),
    limit: int = 100,
    window: int = 60
):
    limiter = RateLimiter(redis)
    client_ip = request.client.host
    result = await limiter.check_rate_limit(f"api:{client_ip}", limit, window)

    if not result["allowed"]:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    return result

# Usage
@router.post("/expensive-operation")
async def expensive_operation(
    _: dict = Depends(lambda: rate_limit(limit=10, window=60))
):
    # Limited to 10 requests per minute
    pass
```

## Pub/Sub for Real-Time Features

```python
# app/services/pubsub.py
from redis.asyncio import Redis
import asyncio
import json
from typing import AsyncGenerator

class PubSubService:
    def __init__(self, redis: Redis):
        self.redis = redis

    async def publish(self, channel: str, message: dict):
        await self.redis.publish(channel, json.dumps(message))

    async def subscribe(self, channel: str) -> AsyncGenerator[dict, None]:
        pubsub = self.redis.pubsub()
        await pubsub.subscribe(channel)

        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    yield json.loads(message["data"])
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.close()
```

### SSE Endpoint

```python
# app/routers/events.py
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.services.pubsub import PubSubService

router = APIRouter()

@router.get("/events/{channel}")
async def event_stream(
    channel: str,
    redis: Redis = Depends(get_redis)
):
    pubsub = PubSubService(redis)

    async def generate():
        async for message in pubsub.subscribe(channel):
            yield f"data: {json.dumps(message)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )
```

## Best Practices

1. **Use connection pooling** for better performance
2. **Handle connection errors** with retries
3. **Use async operations** throughout
4. **Set appropriate TTLs** for all cached data
5. **Use dependency injection** for testability
6. **Implement health checks** for Redis connection

## Conclusion

FastAPI and Redis together provide a powerful combination for building high-performance async applications. Key patterns include:

- Async Redis client with connection pooling
- Dependency injection for cache and auth services
- JWT authentication with Redis blacklist
- Sliding window rate limiting
- Pub/Sub for real-time features

By following these patterns, you can build scalable FastAPI applications that leverage Redis for caching, sessions, and real-time features.
