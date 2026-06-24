# How to Use Redis Dependency Injection in FastAPI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, FastAPI, Dependency Injection, Async, Python

Description: Learn how to use Redis with FastAPI's dependency injection system for clean, testable connection management using aioredis and lifespan events.

---

FastAPI's dependency injection system is ideal for managing Redis connections. Instead of global variables, you declare Redis as a dependency and FastAPI provides it to each route handler automatically.

## Installation

```bash
pip install fastapi redis uvicorn
```

## Application Lifespan and Redis Pool

Use FastAPI's `lifespan` context manager to create and close the connection pool once:

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
import redis.asyncio as aioredis

redis_pool: aioredis.Redis | None = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_pool
    redis_pool = aioredis.Redis(
        host="localhost",
        port=6379,
        db=0,
        decode_responses=True,
        max_connections=20,
    )
    yield
    await redis_pool.aclose()

app = FastAPI(lifespan=lifespan)
```

## Redis Dependency

Define a dependency that provides the Redis client:

```python
from fastapi import Depends

async def get_redis() -> aioredis.Redis:
    if redis_pool is None:
        raise RuntimeError("Redis pool not initialized")
    return redis_pool
```

## Using the Dependency in Routes

```python
from fastapi import APIRouter
from typing import Optional

router = APIRouter()

@router.get("/product/{product_id}")
async def get_product(
    product_id: int,
    redis: aioredis.Redis = Depends(get_redis),
):
    cache_key = f"product:{product_id}"
    cached = await redis.get(cache_key)

    if cached:
        return {"source": "cache", "data": cached}

    # Simulate DB fetch
    data = {"id": product_id, "name": f"Product {product_id}", "price": 29.99}
    await redis.setex(cache_key, 300, str(data))
    return {"source": "db", "data": data}
```

## Dependency with Custom Namespace

Wrap the dependency to add key prefixing:

```python
class RedisNamespace:
    def __init__(self, redis: aioredis.Redis, prefix: str):
        self.redis = redis
        self.prefix = prefix

    async def get(self, key: str) -> Optional[str]:
        return await self.redis.get(f"{self.prefix}:{key}")

    async def set(self, key: str, value: str, ttl: int = 300):
        await self.redis.setex(f"{self.prefix}:{key}", ttl, value)

    async def delete(self, key: str):
        await self.redis.delete(f"{self.prefix}:{key}")


async def get_product_cache(redis: aioredis.Redis = Depends(get_redis)) -> RedisNamespace:
    return RedisNamespace(redis, "product")


@router.get("/products/{pid}/details")
async def product_details(
    pid: int,
    cache: RedisNamespace = Depends(get_product_cache),
):
    cached = await cache.get(str(pid))
    if cached:
        return {"cached": True, "data": cached}

    data = f"Product details for {pid}"
    await cache.set(str(pid), data)
    return {"cached": False, "data": data}
```

## Testing with Dependency Override

Replace Redis with a mock during testing:

```python
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock

def test_get_product_cached():
    mock_redis = AsyncMock()
    mock_redis.get.return_value = "cached_value"

    app.dependency_overrides[get_redis] = lambda: mock_redis

    client = TestClient(app)
    response = client.get("/product/1")
    assert response.json()["source"] == "cache"

    app.dependency_overrides = {}
```

## Summary

FastAPI's dependency injection makes Redis connection management clean and testable. Initialize the Redis pool in a `lifespan` context manager, expose it via a `Depends(get_redis)` dependency, and override it with a mock in tests. Wrapping the dependency in a namespace class adds key prefixing and keeps route handlers free of Redis-specific logic.
