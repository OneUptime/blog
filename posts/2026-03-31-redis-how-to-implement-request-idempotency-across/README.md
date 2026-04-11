# How to Implement Request Idempotency Across Microservices with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Microservice, Idempotency, Distributed System, Backend

Description: Learn how to use Redis to implement request idempotency across microservices, preventing duplicate operations and ensuring safe retries.

---

## What Is Request Idempotency?

Idempotency means that performing the same operation multiple times produces the same result as performing it once. In distributed microservices, network failures and retries can cause duplicate requests. Without idempotency, a payment might be processed twice or an order created multiple times.

Redis provides a fast, atomic key-value store that makes it straightforward to track and deduplicate requests across services.

## How Idempotency Keys Work

Clients generate a unique idempotency key (typically a UUID) for each logical operation. When a service receives a request, it checks Redis for that key. If the key exists, it returns the cached response. If not, it processes the request, stores the result, and returns it.

```text
Client --> Service A --> Redis (check key)
                     --> If exists: return cached response
                     --> If missing: process + store in Redis + return
```

## Setting Up Redis for Idempotency

Install the Redis client for Node.js:

```bash
npm install ioredis uuid
```

Create a Redis connection:

```javascript
const Redis = require('ioredis');
const redis = new Redis({ host: 'localhost', port: 6379 });
```

## Implementing the Idempotency Middleware

```javascript
async function idempotencyMiddleware(req, res, next) {
  const idempotencyKey = req.headers['idempotency-key'];

  if (!idempotencyKey) {
    return res.status(400).json({ error: 'Idempotency-Key header is required' });
  }

  const redisKey = `idempotency:${idempotencyKey}`;
  const existing = await redis.get(redisKey);

  if (existing) {
    const cached = JSON.parse(existing);
    return res.status(cached.status).json(cached.body);
  }

  // Intercept response to cache it
  const originalJson = res.json.bind(res);
  res.json = async (body) => {
    const ttl = 86400; // 24 hours
    await redis.setex(redisKey, ttl, JSON.stringify({ status: res.statusCode, body }));
    return originalJson(body);
  };

  next();
}

module.exports = idempotencyMiddleware;
```

## Using the Middleware in Express

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.post('/payments', idempotencyMiddleware, async (req, res) => {
  const { amount, currency, userId } = req.body;

  // Process payment
  const result = await processPayment({ amount, currency, userId });

  res.status(201).json({ paymentId: result.id, status: 'success' });
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

## Handling Concurrent Requests with the Same Key

Race conditions can occur when two requests with the same key arrive simultaneously. Use Redis SET NX (set if not exists) with a lock:

```javascript
async function processWithIdempotency(key, handler) {
  const lockKey = `idempotency:lock:${key}`;
  const dataKey = `idempotency:data:${key}`;

  // Check for existing result first
  const existing = await redis.get(dataKey);
  if (existing) return JSON.parse(existing);

  // Acquire lock to prevent duplicate processing
  const locked = await redis.set(lockKey, '1', 'EX', 30, 'NX');
  if (!locked) {
    // Another request is processing - wait and retry
    await new Promise(resolve => setTimeout(resolve, 100));
    return processWithIdempotency(key, handler);
  }

  try {
    const result = await handler();
    await redis.setex(dataKey, 86400, JSON.stringify(result));
    return result;
  } finally {
    await redis.del(lockKey);
  }
}
```

## Python Implementation

```python
import redis
import json
import uuid
from functools import wraps

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def idempotent(ttl=86400):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, idempotency_key=None, **kwargs):
            if not idempotency_key:
                raise ValueError("idempotency_key is required")

            redis_key = f"idempotency:{idempotency_key}"
            cached = r.get(redis_key)

            if cached:
                return json.loads(cached)

            result = func(*args, **kwargs)
            r.setex(redis_key, ttl, json.dumps(result))
            return result
        return wrapper
    return decorator

@idempotent(ttl=3600)
def create_order(user_id, items, idempotency_key=None):
    # Process order
    order_id = str(uuid.uuid4())
    return {"order_id": order_id, "user_id": user_id, "items": items, "status": "created"}
```

## Propagating Idempotency Keys Between Services

When Service A calls Service B, pass the idempotency key downstream:

```javascript
const axios = require('axios');

async function callPaymentService(payload, idempotencyKey) {
  const response = await axios.post('http://payment-service/charge', payload, {
    headers: {
      'Idempotency-Key': idempotencyKey,
      'Content-Type': 'application/json'
    }
  });
  return response.data;
}
```

## Redis Key Structure Best Practices

```text
idempotency:{service}:{key}        - Service-scoped keys
idempotency:lock:{key}             - Lock keys for concurrent access
idempotency:payment:{uuid}         - Operation-type scoped keys
```

Use namespacing to avoid key collisions across services and to make debugging easier.

## Setting Appropriate TTLs

```bash
# Set idempotency key with 24-hour expiry
SET idempotency:pay-12345 '{"status":201,"body":{"id":"abc"}}' EX 86400

# Check remaining TTL
TTL idempotency:pay-12345
```

Choose TTL based on your retry window. For payments, 24 hours is common. For idempotent GET requests, a few minutes may suffice.

## Summary

Redis makes request idempotency easy to implement across microservices by providing fast atomic operations and TTL-based key expiration. By storing idempotency keys with their responses, services can safely handle retries without duplicate processing. Use Redis SET NX for concurrent request protection and propagate keys downstream when chaining service calls.
