# How to Use FastAPI with Redis for Caching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, FastAPI, Redis, Caching, Performance, async, redis-py

Description: Learn how to integrate Redis with FastAPI for high-performance caching using async connections, connection pooling, cache decorators, and advanced TTL strategies.

---

> Caching is one of the most effective ways to improve API performance. Redis, with its sub-millisecond latency and rich data structures, is the perfect companion for FastAPI. This guide shows you how to build a robust caching layer that scales with your application.

Caching reduces database load, improves response times, and enables your API to handle more concurrent requests. When combined with FastAPI's async capabilities, Redis becomes an incredibly powerful tool for building high-performance applications.

---

## Setting Up redis-py Async Client

The `redis-py` library provides native async support through `redis.asyncio`. This allows seamless integration with FastAPI's async request handlers.

```python
# redis_client.py
import redis.asyncio as redis
from fastapi import FastAPI
from contextlib import asynccontextmanager

# Global Redis client instance
redis_client: redis.Redis = None

async def init_redis():
    """Initialize the async Redis client"""
    global redis_client
    redis_client = redis.Redis(
        host="localhost",
        port=6379,
        db=0,
        decode_responses=True,  # Automatically decode bytes to strings
        socket_timeout=5.0,     # Connection timeout in seconds
        socket_connect_timeout=5.0
    )
    # Test the connection
    await redis_client.ping()
    return redis_client

async def close_redis():
    """Close the Redis connection"""
    global redis_client
    if redis_client:
        await redis_client.close()

# FastAPI lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Redis
    await init_redis()
    print("Redis connection established")
    yield
    # Shutdown: Close Redis
    await close_redis()
    print("Redis connection closed")

app = FastAPI(lifespan=lifespan)

@app.get("/health")
async def health_check():
    """Check Redis connectivity"""
    try:
        await redis_client.ping()
        return {"status": "healthy", "redis": "connected"}
    except redis.ConnectionError:
        return {"status": "unhealthy", "redis": "disconnected"}
```

---

## Connection Pooling

Connection pooling is essential for production deployments. It reuses connections across requests, reducing overhead and improving throughput.

```python
# connection_pool.py
import redis.asyncio as redis
from redis.asyncio.connection import ConnectionPool
from fastapi import FastAPI, Depends
from contextlib import asynccontextmanager
from typing import AsyncGenerator

# Create a connection pool with specific parameters
pool: ConnectionPool = None

async def create_pool():
    """Create a connection pool for Redis"""
    global pool
    pool = redis.ConnectionPool(
        host="localhost",
        port=6379,
        db=0,
        max_connections=50,      # Maximum connections in the pool
        decode_responses=True,
        socket_timeout=5.0,
        socket_connect_timeout=5.0,
        retry_on_timeout=True    # Automatically retry on timeout
    )
    return pool

async def get_redis() -> AsyncGenerator[redis.Redis, None]:
    """Dependency that provides a Redis client from the pool"""
    client = redis.Redis(connection_pool=pool)
    try:
        yield client
    finally:
        # Connection returns to pool automatically
        await client.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_pool()
    yield
    await pool.disconnect()

app = FastAPI(lifespan=lifespan)

@app.get("/items/{item_id}")
async def get_item(
    item_id: str,
    redis_conn: redis.Redis = Depends(get_redis)
):
    """Endpoint using pooled Redis connection"""
    # Check cache first
    cached = await redis_conn.get(f"item:{item_id}")
    if cached:
        return {"item_id": item_id, "data": cached, "source": "cache"}

    # Simulate database fetch
    data = f"Data for item {item_id}"

    # Store in cache with 5 minute TTL
    await redis_conn.setex(f"item:{item_id}", 300, data)

    return {"item_id": item_id, "data": data, "source": "database"}
```

### Connection Pool Configuration

| Parameter | Description | Recommended Value |
|-----------|-------------|-------------------|
| `max_connections` | Maximum pool size | 10-100 based on load |
| `socket_timeout` | Read/write timeout | 5 seconds |
| `socket_connect_timeout` | Connection timeout | 5 seconds |
| `retry_on_timeout` | Auto-retry on timeout | True for production |
| `health_check_interval` | Connection health check | 30 seconds |

---

## Cache Decorators

Cache decorators provide a clean, reusable way to add caching to any function. This pattern reduces boilerplate and keeps your code DRY.

```python
# cache_decorator.py
import redis.asyncio as redis
import json
import hashlib
from functools import wraps
from typing import Callable, Optional, Any

# Global Redis client (initialized at startup)
redis_client: redis.Redis = None

def cache(
    ttl: int = 300,
    prefix: str = "cache",
    key_builder: Optional[Callable] = None
):
    """
    Decorator to cache function results in Redis.

    Args:
        ttl: Time-to-live in seconds (default 5 minutes)
        prefix: Cache key prefix for namespacing
        key_builder: Custom function to build cache key
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Build cache key
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                # Default key builder using function name and arguments
                key_parts = [prefix, func.__name__]

                # Add positional arguments to key
                for arg in args:
                    if hasattr(arg, "__dict__"):
                        # Skip complex objects like Request
                        continue
                    key_parts.append(str(arg))

                # Add keyword arguments to key
                for k, v in sorted(kwargs.items()):
                    key_parts.append(f"{k}={v}")

                cache_key = ":".join(key_parts)

            # Try to get from cache
            try:
                cached = await redis_client.get(cache_key)
                if cached:
                    return json.loads(cached)
            except (redis.ConnectionError, json.JSONDecodeError):
                # If Redis is down or data is corrupted, proceed without cache
                pass

            # Call the actual function
            result = await func(*args, **kwargs)

            # Store result in cache
            try:
                await redis_client.setex(
                    cache_key,
                    ttl,
                    json.dumps(result)
                )
            except redis.ConnectionError:
                # If Redis is down, proceed without caching
                pass

            return result
        return wrapper
    return decorator

# Custom key builder example
def user_key_builder(user_id: int, include_details: bool = False):
    """Build cache key for user data"""
    return f"user:{user_id}:details={include_details}"

# Usage examples
@cache(ttl=600, prefix="users")
async def get_user_by_id(user_id: int) -> dict:
    """Cached function to get user by ID"""
    # Simulate database query
    return {"id": user_id, "name": f"User {user_id}"}

@cache(ttl=3600, key_builder=user_key_builder)
async def get_user_with_custom_key(user_id: int, include_details: bool = False) -> dict:
    """Cached function with custom key builder"""
    result = {"id": user_id, "name": f"User {user_id}"}
    if include_details:
        result["details"] = {"email": f"user{user_id}@example.com"}
    return result
```

### Advanced Cache Decorator with Serialization

```python
# advanced_cache.py
import redis.asyncio as redis
import pickle
import hashlib
from functools import wraps
from typing import Callable, Optional, Union
from enum import Enum

class SerializationType(Enum):
    JSON = "json"
    PICKLE = "pickle"

def advanced_cache(
    ttl: int = 300,
    prefix: str = "cache",
    serialization: SerializationType = SerializationType.JSON,
    skip_cache_on_error: bool = True,
    cache_none: bool = False
):
    """
    Advanced cache decorator with multiple serialization options.

    Args:
        ttl: Time-to-live in seconds
        prefix: Cache key prefix
        serialization: JSON or PICKLE serialization
        skip_cache_on_error: Continue without cache on Redis errors
        cache_none: Whether to cache None results
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Build cache key using hash for complex arguments
            key_data = f"{func.__module__}.{func.__name__}:{args}:{kwargs}"
            key_hash = hashlib.sha256(key_data.encode()).hexdigest()[:16]
            cache_key = f"{prefix}:{func.__name__}:{key_hash}"

            # Try to get from cache
            try:
                cached = await redis_client.get(cache_key)
                if cached:
                    if serialization == SerializationType.JSON:
                        return json.loads(cached)
                    else:
                        return pickle.loads(cached.encode("latin-1"))
            except Exception as e:
                if not skip_cache_on_error:
                    raise

            # Execute function
            result = await func(*args, **kwargs)

            # Cache result (optionally skip None)
            if result is not None or cache_none:
                try:
                    if serialization == SerializationType.JSON:
                        serialized = json.dumps(result)
                    else:
                        serialized = pickle.dumps(result).decode("latin-1")

                    await redis_client.setex(cache_key, ttl, serialized)
                except Exception as e:
                    if not skip_cache_on_error:
                        raise

            return result
        return wrapper
    return decorator
```

---

## TTL Strategies

Choosing the right Time-To-Live (TTL) strategy is crucial for cache effectiveness. Different data types require different expiration policies.

```python
# ttl_strategies.py
import redis.asyncio as redis
from datetime import datetime, timedelta
from typing import Optional

class TTLStrategies:
    """Different TTL strategies for various use cases"""

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    async def set_with_absolute_expiry(
        self,
        key: str,
        value: str,
        expire_at: datetime
    ):
        """
        Set value with absolute expiration time.
        Useful for: Session tokens, time-limited offers
        """
        await self.redis.set(key, value)
        await self.redis.expireat(key, expire_at)

    async def set_with_sliding_expiry(
        self,
        key: str,
        value: str,
        ttl_seconds: int
    ):
        """
        Set value with sliding expiration (extends on access).
        Useful for: User sessions, activity-based caching
        """
        await self.redis.setex(key, ttl_seconds, value)

    async def get_and_extend(
        self,
        key: str,
        extend_seconds: int
    ) -> Optional[str]:
        """Get value and extend TTL if it exists"""
        value = await self.redis.get(key)
        if value:
            await self.redis.expire(key, extend_seconds)
        return value

    async def set_with_stale_while_revalidate(
        self,
        key: str,
        value: str,
        fresh_ttl: int,
        stale_ttl: int
    ):
        """
        Cache with stale-while-revalidate pattern.
        Returns stale data while background refresh happens.

        Useful for: High-traffic endpoints, API responses
        """
        # Store the actual value
        await self.redis.setex(f"{key}:value", fresh_ttl + stale_ttl, value)
        # Store the freshness marker
        await self.redis.setex(f"{key}:fresh", fresh_ttl, "1")

    async def get_with_stale_check(self, key: str) -> tuple[Optional[str], bool]:
        """
        Get value and check if it's stale.
        Returns (value, is_fresh) tuple.
        """
        pipe = self.redis.pipeline()
        pipe.get(f"{key}:value")
        pipe.exists(f"{key}:fresh")
        results = await pipe.execute()

        value = results[0]
        is_fresh = bool(results[1])

        return value, is_fresh

# TTL Constants for different data types
class CacheTTL:
    """Standard TTL values for different cache types"""

    # User data - moderate TTL, changes occasionally
    USER_PROFILE = 600        # 10 minutes
    USER_PREFERENCES = 3600   # 1 hour

    # Application data - longer TTL, rarely changes
    CONFIG = 86400            # 24 hours
    FEATURE_FLAGS = 300       # 5 minutes

    # Transient data - short TTL
    RATE_LIMIT = 60           # 1 minute
    SEARCH_RESULTS = 120      # 2 minutes

    # Session data
    SESSION = 1800            # 30 minutes
    REFRESH_TOKEN = 604800    # 7 days

# Usage in FastAPI
from fastapi import FastAPI, Depends

app = FastAPI()

@app.get("/user/{user_id}")
async def get_user(user_id: int):
    """Get user with appropriate TTL"""
    cache_key = f"user:{user_id}"

    # Check cache
    cached = await redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    # Fetch from database
    user = await fetch_user_from_db(user_id)

    # Cache with user profile TTL
    await redis_client.setex(
        cache_key,
        CacheTTL.USER_PROFILE,
        json.dumps(user)
    )

    return user
```

---

## Cache Invalidation

Cache invalidation is notoriously difficult. These patterns help you invalidate caches correctly and efficiently.

```python
# cache_invalidation.py
import redis.asyncio as redis
from typing import List, Optional
import fnmatch

class CacheInvalidator:
    """Utilities for cache invalidation patterns"""

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    async def invalidate_single(self, key: str) -> bool:
        """
        Invalidate a single cache key.
        Most precise but requires knowing exact key.
        """
        result = await self.redis.delete(key)
        return result > 0

    async def invalidate_pattern(self, pattern: str) -> int:
        """
        Invalidate all keys matching a pattern.
        Use with caution - SCAN can be slow on large datasets.

        Example: invalidate_pattern("user:123:*")
        """
        deleted = 0
        cursor = 0

        while True:
            cursor, keys = await self.redis.scan(
                cursor=cursor,
                match=pattern,
                count=100
            )

            if keys:
                deleted += await self.redis.delete(*keys)

            if cursor == 0:
                break

        return deleted

    async def invalidate_by_tags(self, tags: List[str]) -> int:
        """
        Invalidate all cache entries with given tags.
        Requires storing tag associations.
        """
        deleted = 0

        for tag in tags:
            # Get all keys associated with this tag
            keys = await self.redis.smembers(f"tag:{tag}")

            if keys:
                # Delete the cached values
                deleted += await self.redis.delete(*keys)
                # Clean up the tag set
                await self.redis.delete(f"tag:{tag}")

        return deleted

    async def set_with_tags(
        self,
        key: str,
        value: str,
        ttl: int,
        tags: List[str]
    ):
        """Store value with associated tags for later invalidation"""
        pipe = self.redis.pipeline()

        # Store the value
        pipe.setex(key, ttl, value)

        # Associate key with each tag
        for tag in tags:
            pipe.sadd(f"tag:{tag}", key)
            pipe.expire(f"tag:{tag}", ttl + 60)  # Tags expire slightly after values

        await pipe.execute()

# Usage example in FastAPI
from fastapi import FastAPI

app = FastAPI()
invalidator = CacheInvalidator(redis_client)

@app.put("/user/{user_id}")
async def update_user(user_id: int, user_data: dict):
    """Update user and invalidate related caches"""
    # Update in database
    await update_user_in_db(user_id, user_data)

    # Invalidate all caches related to this user
    await invalidator.invalidate_pattern(f"user:{user_id}:*")

    # Also invalidate any lists containing this user
    await invalidator.invalidate_by_tags([f"user:{user_id}"])

    return {"status": "updated", "user_id": user_id}

@app.get("/users")
async def list_users():
    """Get users list with tag-based caching"""
    cache_key = "users:list"

    cached = await redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    users = await fetch_all_users()

    # Cache with tags for each user (for invalidation)
    tags = [f"user:{u['id']}" for u in users]
    await invalidator.set_with_tags(
        cache_key,
        json.dumps(users),
        ttl=300,
        tags=tags
    )

    return users
```

### Event-Driven Cache Invalidation

```python
# event_invalidation.py
import redis.asyncio as redis
from typing import Callable, Dict, List
import asyncio

class CacheEventBus:
    """
    Pub/Sub based cache invalidation.
    Useful for distributed systems where multiple services
    need to invalidate caches.
    """

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.pubsub = redis_client.pubsub()
        self.handlers: Dict[str, List[Callable]] = {}

    async def subscribe(self, event: str, handler: Callable):
        """Subscribe to cache invalidation events"""
        if event not in self.handlers:
            self.handlers[event] = []
            await self.pubsub.subscribe(f"cache:invalidate:{event}")
        self.handlers[event].append(handler)

    async def publish(self, event: str, data: str):
        """Publish a cache invalidation event"""
        await self.redis.publish(f"cache:invalidate:{event}", data)

    async def listen(self):
        """Start listening for invalidation events"""
        async for message in self.pubsub.listen():
            if message["type"] == "message":
                event = message["channel"].split(":")[-1]
                data = message["data"]

                handlers = self.handlers.get(event, [])
                for handler in handlers:
                    await handler(data)

# Usage
event_bus = CacheEventBus(redis_client)

async def handle_user_update(user_id: str):
    """Handler for user update events"""
    await redis_client.delete(f"user:{user_id}")
    await redis_client.delete(f"user:{user_id}:profile")

# Subscribe to events
await event_bus.subscribe("user_updated", handle_user_update)

# Publish invalidation event from another service
await event_bus.publish("user_updated", "123")
```

---

## Response Caching

Cache entire API responses for maximum performance. This is especially effective for read-heavy endpoints with identical responses.

```python
# response_caching.py
import redis.asyncio as redis
from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import hashlib
import json
from typing import List, Optional

class ResponseCacheMiddleware(BaseHTTPMiddleware):
    """
    Middleware to cache entire HTTP responses.
    Only caches GET requests by default.
    """

    def __init__(
        self,
        app,
        redis_client: redis.Redis,
        ttl: int = 300,
        cacheable_paths: Optional[List[str]] = None,
        excluded_paths: Optional[List[str]] = None
    ):
        super().__init__(app)
        self.redis = redis_client
        self.ttl = ttl
        self.cacheable_paths = cacheable_paths or []
        self.excluded_paths = excluded_paths or ["/health", "/metrics"]

    def _should_cache(self, request: Request) -> bool:
        """Determine if request should be cached"""
        # Only cache GET requests
        if request.method != "GET":
            return False

        # Check excluded paths
        if request.url.path in self.excluded_paths:
            return False

        # If cacheable_paths specified, check if path is included
        if self.cacheable_paths:
            return any(
                request.url.path.startswith(p)
                for p in self.cacheable_paths
            )

        return True

    def _build_cache_key(self, request: Request) -> str:
        """Build unique cache key from request"""
        # Include path and query parameters
        key_parts = [
            request.method,
            request.url.path,
            str(sorted(request.query_params.items()))
        ]

        # Optionally include user identifier for personalized caching
        user_id = request.headers.get("X-User-ID", "anonymous")
        key_parts.append(user_id)

        key_string = ":".join(key_parts)
        key_hash = hashlib.sha256(key_string.encode()).hexdigest()[:16]

        return f"response:{key_hash}"

    async def dispatch(self, request: Request, call_next):
        # Check if request should be cached
        if not self._should_cache(request):
            return await call_next(request)

        cache_key = self._build_cache_key(request)

        # Try to get cached response
        try:
            cached = await self.redis.get(cache_key)
            if cached:
                cached_data = json.loads(cached)
                response = Response(
                    content=cached_data["body"],
                    status_code=cached_data["status_code"],
                    media_type=cached_data["media_type"]
                )
                response.headers["X-Cache"] = "HIT"
                return response
        except (redis.ConnectionError, json.JSONDecodeError):
            pass

        # Execute request
        response = await call_next(request)

        # Cache successful responses
        if 200 <= response.status_code < 300:
            # Read response body
            body = b""
            async for chunk in response.body_iterator:
                body += chunk

            # Store in cache
            try:
                cache_data = {
                    "body": body.decode(),
                    "status_code": response.status_code,
                    "media_type": response.media_type
                }
                await self.redis.setex(
                    cache_key,
                    self.ttl,
                    json.dumps(cache_data)
                )
            except redis.ConnectionError:
                pass

            # Create new response with body
            new_response = Response(
                content=body,
                status_code=response.status_code,
                media_type=response.media_type
            )
            new_response.headers["X-Cache"] = "MISS"
            return new_response

        return response

# Usage
app = FastAPI()

app.add_middleware(
    ResponseCacheMiddleware,
    redis_client=redis_client,
    ttl=300,
    cacheable_paths=["/api/products", "/api/categories"],
    excluded_paths=["/health", "/api/user"]
)

# Per-route response caching with decorator
def cache_response(ttl: int = 300):
    """Decorator for caching individual route responses"""
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            # Build cache key
            cache_key = f"route:{request.url.path}:{request.url.query}"

            # Check cache
            cached = await redis_client.get(cache_key)
            if cached:
                return JSONResponse(
                    content=json.loads(cached),
                    headers={"X-Cache": "HIT"}
                )

            # Execute function
            result = await func(request, *args, **kwargs)

            # Cache result
            await redis_client.setex(cache_key, ttl, json.dumps(result))

            return JSONResponse(
                content=result,
                headers={"X-Cache": "MISS"}
            )
        return wrapper
    return decorator

@app.get("/products")
@cache_response(ttl=600)
async def get_products(request: Request):
    """Cached products endpoint"""
    return await fetch_products()
```

---

## Session Storage

Redis is ideal for session storage due to its speed and built-in expiration. Here is a complete session management implementation.

```python
# session_storage.py
import redis.asyncio as redis
from fastapi import FastAPI, Request, Response, Depends, HTTPException
from fastapi.security import HTTPBearer
import secrets
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from pydantic import BaseModel

class SessionData(BaseModel):
    """Session data model"""
    user_id: str
    created_at: str
    last_accessed: str
    data: Dict[str, Any] = {}

class RedisSessionManager:
    """
    Redis-based session management with sliding expiration.
    """

    def __init__(
        self,
        redis_client: redis.Redis,
        session_ttl: int = 1800,  # 30 minutes
        prefix: str = "session"
    ):
        self.redis = redis_client
        self.ttl = session_ttl
        self.prefix = prefix

    def _generate_session_id(self) -> str:
        """Generate cryptographically secure session ID"""
        return secrets.token_urlsafe(32)

    def _session_key(self, session_id: str) -> str:
        """Build Redis key for session"""
        return f"{self.prefix}:{session_id}"

    async def create_session(
        self,
        user_id: str,
        initial_data: Dict[str, Any] = None
    ) -> tuple[str, SessionData]:
        """Create a new session"""
        session_id = self._generate_session_id()
        now = datetime.utcnow().isoformat()

        session = SessionData(
            user_id=user_id,
            created_at=now,
            last_accessed=now,
            data=initial_data or {}
        )

        await self.redis.setex(
            self._session_key(session_id),
            self.ttl,
            session.model_dump_json()
        )

        return session_id, session

    async def get_session(
        self,
        session_id: str,
        extend_ttl: bool = True
    ) -> Optional[SessionData]:
        """Get session by ID, optionally extending TTL"""
        key = self._session_key(session_id)

        data = await self.redis.get(key)
        if not data:
            return None

        session = SessionData.model_validate_json(data)

        if extend_ttl:
            # Update last accessed and extend TTL
            session.last_accessed = datetime.utcnow().isoformat()
            await self.redis.setex(key, self.ttl, session.model_dump_json())

        return session

    async def update_session(
        self,
        session_id: str,
        data: Dict[str, Any]
    ) -> Optional[SessionData]:
        """Update session data"""
        session = await self.get_session(session_id, extend_ttl=False)
        if not session:
            return None

        session.data.update(data)
        session.last_accessed = datetime.utcnow().isoformat()

        await self.redis.setex(
            self._session_key(session_id),
            self.ttl,
            session.model_dump_json()
        )

        return session

    async def delete_session(self, session_id: str) -> bool:
        """Delete/invalidate a session"""
        result = await self.redis.delete(self._session_key(session_id))
        return result > 0

    async def delete_user_sessions(self, user_id: str) -> int:
        """Delete all sessions for a user"""
        # Scan for user's sessions
        deleted = 0
        cursor = 0

        while True:
            cursor, keys = await self.redis.scan(
                cursor=cursor,
                match=f"{self.prefix}:*",
                count=100
            )

            for key in keys:
                data = await self.redis.get(key)
                if data:
                    session = SessionData.model_validate_json(data)
                    if session.user_id == user_id:
                        await self.redis.delete(key)
                        deleted += 1

            if cursor == 0:
                break

        return deleted

# FastAPI Integration
app = FastAPI()
session_manager = RedisSessionManager(redis_client, session_ttl=1800)

async def get_current_session(request: Request) -> SessionData:
    """Dependency to get current session from cookie"""
    session_id = request.cookies.get("session_id")

    if not session_id:
        raise HTTPException(status_code=401, detail="No session found")

    session = await session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    return session

@app.post("/login")
async def login(response: Response, username: str, password: str):
    """Create session on login"""
    # Verify credentials (simplified)
    user_id = await verify_credentials(username, password)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Create session
    session_id, session = await session_manager.create_session(
        user_id=user_id,
        initial_data={"username": username}
    )

    # Set session cookie
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=1800
    )

    return {"status": "logged_in", "user_id": user_id}

@app.post("/logout")
async def logout(
    response: Response,
    session: SessionData = Depends(get_current_session),
    request: Request = None
):
    """Delete session on logout"""
    session_id = request.cookies.get("session_id")
    await session_manager.delete_session(session_id)

    response.delete_cookie("session_id")
    return {"status": "logged_out"}

@app.get("/profile")
async def get_profile(session: SessionData = Depends(get_current_session)):
    """Protected route using session"""
    return {
        "user_id": session.user_id,
        "session_data": session.data
    }
```

---

## Best Practices Summary

### Connection Management
- Always use connection pooling in production
- Set appropriate timeouts to prevent hanging connections
- Implement retry logic for transient failures
- Close connections properly on shutdown

### Caching Strategy
- Choose TTL based on data volatility
- Use cache prefixes for namespace isolation
- Implement stale-while-revalidate for high-traffic endpoints
- Consider memory limits when setting TTL

### Cache Invalidation
- Prefer precise invalidation over pattern-based when possible
- Use tags for related data invalidation
- Implement event-driven invalidation for distributed systems
- Always invalidate on data mutations

### Error Handling
- Never let cache failures break your application
- Implement fallback to database on cache miss
- Log cache errors for monitoring
- Use circuit breakers for Redis failures

### Monitoring
- Track cache hit/miss ratios
- Monitor Redis memory usage
- Set up alerts for connection pool exhaustion
- Log slow Redis operations

---

## Conclusion

Redis and FastAPI together create a powerful foundation for high-performance APIs. Key takeaways:

- Use **async redis-py** for non-blocking operations
- **Connection pooling** is essential for production workloads
- **Cache decorators** keep your code clean and maintainable
- Choose **TTL strategies** based on your data characteristics
- Implement **proper invalidation** to prevent stale data
- **Response caching** provides maximum performance gains
- **Session storage** in Redis enables scalable user management

By following these patterns, you can build APIs that handle high traffic while maintaining fast response times.

---

*Need to monitor your Redis cache performance? [OneUptime](https://oneuptime.com) provides comprehensive monitoring for Redis, FastAPI, and your entire infrastructure with real-time metrics and intelligent alerting.*
