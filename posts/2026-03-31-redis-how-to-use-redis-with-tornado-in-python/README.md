# How to Use Redis with Tornado in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Tornado, Python, Caching, Async

Description: Learn how to integrate Redis with Tornado in Python for async caching, session management, and pub/sub using aioredis with practical examples.

---

Tornado is an asynchronous Python web framework and networking library. It pairs well with Redis for caching, session storage, and real-time pub/sub. Since Tornado is built around async I/O, you should use an async Redis client like `redis.asyncio` (bundled with `redis-py` v4+).

## Installing Dependencies

```bash
pip install tornado redis
```

## Creating an Async Redis Client

```python
import redis.asyncio as aioredis
import tornado.web

redis_client = None

async def init_redis():
    global redis_client
    redis_client = aioredis.from_url(
        "redis://localhost:6379",
        password=None,
        decode_responses=True,
    )
    await redis_client.ping()
    print("Redis connected")
```

## Caching in Request Handlers

Tornado request handlers can use `await` for async Redis operations.

```python
class ProductHandler(tornado.web.RequestHandler):
    async def get(self, product_id):
        cache_key = f"product:{product_id}"
        cached = await redis_client.get(cache_key)
        if cached:
            self.set_header("X-Cache", "HIT")
            self.write(cached)
            return

        # Simulate DB fetch
        product = {"id": product_id, "name": "Widget"}
        import json
        product_json = json.dumps(product)
        await redis_client.setex(cache_key, 120, product_json)  # 2-minute TTL
        self.set_header("X-Cache", "MISS")
        self.write(product_json)
```

## Session Storage

Store session data in Redis using a token-based approach.

```python
import uuid
import json

class LoginHandler(tornado.web.RequestHandler):
    async def post(self):
        data = json.loads(self.request.body)
        username = data.get("username")
        session_id = str(uuid.uuid4())
        session_data = json.dumps({"user": username})
        await redis_client.setex(f"session:{session_id}", 86400, session_data)
        self.set_cookie("session_id", session_id, httponly=True)
        self.write({"message": "Logged in"})

class ProfileHandler(tornado.web.RequestHandler):
    async def get(self):
        session_id = self.get_cookie("session_id")
        if not session_id:
            self.set_status(401)
            return
        raw = await redis_client.get(f"session:{session_id}")
        if not raw:
            self.set_status(401)
            return
        self.write(json.loads(raw))
```

## Pub/Sub with Tornado

Use separate Redis connections for pub/sub since subscriptions block the connection.

```python
import asyncio

async def listen_for_messages():
    pubsub = redis_client.pubsub()
    await pubsub.subscribe("notifications")
    async for message in pubsub.listen():
        if message["type"] == "message":
            print(f"Received: {message['data']}")

class NotifyHandler(tornado.web.RequestHandler):
    async def post(self):
        data = self.request.body.decode()
        await redis_client.publish("notifications", data)
        self.write({"sent": True})
```

## Application Startup

Wire up Redis initialization before starting the Tornado IOLoop.

```python
def make_app():
    return tornado.web.Application([
        (r"/products/([^/]+)", ProductHandler),
        (r"/notify", NotifyHandler),
    ])

async def main():
    await init_redis()
    app = make_app()
    app.listen(8888)
    await asyncio.Event().wait()

if __name__ == "__main__":
    asyncio.run(main())
```

## Summary

Redis integrates cleanly with Tornado through the async API provided by `redis.asyncio`. Use `setex` for TTL-based caching in request handlers, store sessions as JSON under unique session keys, and use separate Redis connections for pub/sub subscriptions to avoid blocking your event loop.
