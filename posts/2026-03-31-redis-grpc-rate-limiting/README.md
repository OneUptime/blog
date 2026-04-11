# How to Implement gRPC Rate Limiting with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, gRPC, Rate Limiting

Description: Learn how to add Redis-backed rate limiting to gRPC services using server interceptors to enforce per-client request quotas without modifying business logic.

---

gRPC services can receive high call volumes from multiple clients. Rate limiting protects backends from overload and enforces fair usage. By implementing a gRPC server interceptor backed by Redis, you can apply rate limits transparently without modifying individual service handlers.

## Rate Limiting with gRPC Server Interceptor (Node.js)

```javascript
const grpc = require('@grpc/grpc-js');
const { createClient } = require('redis');

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

async function checkRateLimit(clientId, method, limit = 60, windowSeconds = 60) {
  const window = Math.floor(Date.now() / 1000 / windowSeconds);
  const key = `grpc:rl:${clientId}:${method}:${window}`;

  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSeconds);

  return { allowed: count <= limit, count, limit };
}

function rateLimitInterceptor(call, callback, next) {
  // Extract client ID from metadata
  const metadata = call.metadata;
  const clientId = metadata.get('x-client-id')[0] || call.getPeer();
  const method = call.handler?.path || 'unknown';

  checkRateLimit(clientId, method).then(({ allowed, count, limit }) => {
    if (!allowed) {
      const err = {
        code: grpc.status.RESOURCE_EXHAUSTED,
        message: `Rate limit exceeded: ${count}/${limit} requests per minute`
      };
      return callback(err);
    }
    next();
  }).catch((err) => {
    // Fail open on Redis errors
    console.error('Rate limit check failed:', err);
    next();
  });
}
```

## Python gRPC Interceptor

```python
import grpc
import redis
import time
import os

r = redis.Redis.from_url(os.environ['REDIS_URL'])

class RateLimitInterceptor(grpc.ServerInterceptor):
    def __init__(self, limit=100, window=60):
        self.limit = limit
        self.window = window

    def intercept_service(self, continuation, handler_call_details):
        handler = continuation(handler_call_details)

        def wrapper(request_or_iterator, servicer_context):
            peer = servicer_context.peer()
            method = handler_call_details.method
            window_bucket = int(time.time() / self.window)
            key = f"grpc:rl:{peer}:{method}:{window_bucket}"

            try:
                count = r.incr(key)
                if count == 1:
                    r.expire(key, self.window)

                if count > self.limit:
                    servicer_context.abort(
                        grpc.StatusCode.RESOURCE_EXHAUSTED,
                        f"Rate limit exceeded: {count}/{self.limit}"
                    )
                    return
            except redis.RedisError:
                pass  # Fail open

            return handler.unary_unary(request_or_iterator, servicer_context)

        return grpc.unary_unary_rpc_method_handler(wrapper)
```

## Apply the Interceptor

```python
interceptor = RateLimitInterceptor(limit=100, window=60)
server = grpc.server(
    futures.ThreadPoolExecutor(max_workers=10),
    interceptors=[interceptor]
)
```

## Per-Method Rate Limits

Store limits per method in Redis for dynamic configuration:

```python
async def get_method_limit(method):
    key = f"grpc:config:limit:{method}"
    limit = await redis.get(key)
    return int(limit) if limit else 100
```

Set method-specific limits at runtime:

```bash
redis-cli set "grpc:config:limit:/product.ProductService/GetProduct" 200
redis-cli set "grpc:config:limit:/product.ProductService/ListProducts" 50
```

## Viewing Rate Limit State

```bash
redis-cli keys "grpc:rl:*"
redis-cli get "grpc:rl:172.17.0.1:50049:/product.ProductService/GetProduct:28434"
```

## Summary

gRPC server interceptors provide a clean way to enforce rate limits without modifying business logic. Redis stores the per-client counters with automatic expiry via TTL. The fail-open pattern - allowing requests through if Redis is unreachable - is recommended so a Redis outage does not take down your gRPC service. Dynamic per-method limits stored in Redis allow runtime tuning without redeployments.
