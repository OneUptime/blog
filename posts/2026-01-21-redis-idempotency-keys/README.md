# How to Implement Idempotency Keys with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Idempotency, API, Distributed Systems, Deduplication, Reliability

Description: A comprehensive guide to implementing idempotency keys with Redis for preventing duplicate API requests, ensuring exactly-once processing, and building reliable distributed systems.

---

Idempotency keys ensure that duplicate requests produce the same result without unintended side effects. This is critical for payment processing, order creation, and any operation where retries could cause duplicate charges or entries. Redis provides excellent primitives for implementing idempotency with its atomic operations and key expiration.

## What is Idempotency?

An operation is idempotent if performing it multiple times produces the same result as performing it once. For API endpoints:

- GET requests are naturally idempotent
- POST/PUT/DELETE may need idempotency keys to be safe to retry

## Basic Idempotency Implementation

```python
import redis
import json
import hashlib
import time
from typing import Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
from functools import wraps

class IdempotencyStatus(Enum):
    NEW = "new"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class IdempotencyRecord:
    key: str
    status: IdempotencyStatus
    result: Optional[dict]
    created_at: float
    completed_at: Optional[float]
    error: Optional[str]

class IdempotencyStore:
    """Redis-based idempotency key storage."""

    def __init__(self, redis_url='redis://localhost:6379',
                 key_prefix: str = 'idempotency',
                 ttl: int = 86400):  # 24 hours default
        self.redis = redis.from_url(redis_url, decode_responses=True)
        self.key_prefix = key_prefix
        self.ttl = ttl

    def _make_key(self, idempotency_key: str) -> str:
        return f"{self.key_prefix}:{idempotency_key}"

    def check_and_start(self, idempotency_key: str) -> Tuple[bool, Optional[IdempotencyRecord]]:
        """
        Check if request is new and mark as processing.

        Returns:
            (is_new, existing_record) - True if new request, None if new
        """
        key = self._make_key(idempotency_key)
        now = time.time()

        # Try to set as processing (only if not exists)
        lua_script = """
        local existing = redis.call('GET', KEYS[1])
        if existing then
            return existing
        end

        local record = cjson.encode({
            status = 'processing',
            created_at = ARGV[1],
            completed_at = nil,
            result = nil,
            error = nil
        })
        redis.call('SET', KEYS[1], record, 'EX', ARGV[2])
        return nil
        """

        result = self.redis.eval(lua_script, 1, key, now, self.ttl)

        if result is None:
            return True, None  # New request

        # Existing request found
        data = json.loads(result)
        return False, IdempotencyRecord(
            key=idempotency_key,
            status=IdempotencyStatus(data['status']),
            result=data.get('result'),
            created_at=data['created_at'],
            completed_at=data.get('completed_at'),
            error=data.get('error')
        )

    def complete(self, idempotency_key: str, result: dict):
        """Mark request as completed with result."""
        key = self._make_key(idempotency_key)

        record = {
            'status': 'completed',
            'created_at': time.time(),
            'completed_at': time.time(),
            'result': result,
            'error': None
        }

        self.redis.set(key, json.dumps(record), ex=self.ttl)

    def fail(self, idempotency_key: str, error: str):
        """Mark request as failed."""
        key = self._make_key(idempotency_key)

        record = {
            'status': 'failed',
            'created_at': time.time(),
            'completed_at': time.time(),
            'result': None,
            'error': error
        }

        self.redis.set(key, json.dumps(record), ex=self.ttl)

    def get(self, idempotency_key: str) -> Optional[IdempotencyRecord]:
        """Get existing idempotency record."""
        key = self._make_key(idempotency_key)
        data = self.redis.get(key)

        if not data:
            return None

        parsed = json.loads(data)
        return IdempotencyRecord(
            key=idempotency_key,
            status=IdempotencyStatus(parsed['status']),
            result=parsed.get('result'),
            created_at=parsed['created_at'],
            completed_at=parsed.get('completed_at'),
            error=parsed.get('error')
        )

    def delete(self, idempotency_key: str) -> bool:
        """Delete an idempotency record (admin action)."""
        key = self._make_key(idempotency_key)
        return self.redis.delete(key) > 0


class IdempotentOperation:
    """Wrapper for making operations idempotent."""

    def __init__(self, store: IdempotencyStore,
                 retry_processing_after: int = 60):
        self.store = store
        self.retry_processing_after = retry_processing_after

    def execute(self, idempotency_key: str,
                operation: callable,
                *args, **kwargs) -> Tuple[dict, bool]:
        """
        Execute operation idempotently.

        Returns:
            (result, was_cached) - Result and whether it came from cache
        """
        is_new, existing = self.store.check_and_start(idempotency_key)

        if not is_new:
            # Request already seen
            if existing.status == IdempotencyStatus.COMPLETED:
                return existing.result, True

            elif existing.status == IdempotencyStatus.PROCESSING:
                # Check if stuck
                age = time.time() - existing.created_at
                if age > self.retry_processing_after:
                    # Retry processing
                    is_new = True
                else:
                    raise IdempotencyConflictError(
                        "Request is being processed",
                        retry_after=int(self.retry_processing_after - age)
                    )

            elif existing.status == IdempotencyStatus.FAILED:
                raise IdempotencyFailedError(
                    f"Previous request failed: {existing.error}"
                )

        # Execute operation
        try:
            result = operation(*args, **kwargs)
            self.store.complete(idempotency_key, result)
            return result, False

        except Exception as e:
            self.store.fail(idempotency_key, str(e))
            raise


class IdempotencyConflictError(Exception):
    def __init__(self, message, retry_after=None):
        super().__init__(message)
        self.retry_after = retry_after


class IdempotencyFailedError(Exception):
    pass


# Flask integration
def idempotent(key_header='X-Idempotency-Key', ttl=86400):
    """Decorator for idempotent Flask endpoints."""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            from flask import request, jsonify, make_response

            idempotency_key = request.headers.get(key_header)

            if not idempotency_key:
                # No idempotency key, execute normally
                return f(*args, **kwargs)

            store = IdempotencyStore(ttl=ttl)
            op = IdempotentOperation(store)

            try:
                result, was_cached = op.execute(
                    idempotency_key,
                    lambda: f(*args, **kwargs)
                )

                response = make_response(result)
                if was_cached:
                    response.headers['X-Idempotency-Replayed'] = 'true'
                return response

            except IdempotencyConflictError as e:
                response = make_response(
                    jsonify({'error': str(e)}),
                    409
                )
                if e.retry_after:
                    response.headers['Retry-After'] = str(e.retry_after)
                return response

            except IdempotencyFailedError as e:
                return jsonify({'error': str(e)}), 422

        return wrapper
    return decorator


# FastAPI integration
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse

async def idempotency_middleware(request: Request, call_next,
                                  store: IdempotencyStore):
    """FastAPI middleware for idempotency."""
    idempotency_key = request.headers.get('X-Idempotency-Key')

    if not idempotency_key or request.method == 'GET':
        return await call_next(request)

    is_new, existing = store.check_and_start(idempotency_key)

    if not is_new:
        if existing.status == IdempotencyStatus.COMPLETED:
            response = JSONResponse(content=existing.result)
            response.headers['X-Idempotency-Replayed'] = 'true'
            return response

        elif existing.status == IdempotencyStatus.PROCESSING:
            raise HTTPException(
                status_code=409,
                detail="Request is being processed"
            )

    try:
        response = await call_next(request)
        # Note: In real implementation, capture response body
        return response
    except Exception as e:
        store.fail(idempotency_key, str(e))
        raise


# Usage example
if __name__ == "__main__":
    store = IdempotencyStore()
    op = IdempotentOperation(store)

    def create_payment(amount, currency):
        # Simulate payment processing
        import uuid
        time.sleep(1)
        return {
            'payment_id': str(uuid.uuid4()),
            'amount': amount,
            'currency': currency,
            'status': 'completed'
        }

    # First request
    idempotency_key = "payment-abc-123"
    result1, cached1 = op.execute(
        idempotency_key,
        create_payment,
        amount=100,
        currency='USD'
    )
    print(f"First request: {result1}, cached: {cached1}")

    # Duplicate request
    result2, cached2 = op.execute(
        idempotency_key,
        create_payment,
        amount=100,
        currency='USD'
    )
    print(f"Second request: {result2}, cached: {cached2}")

    # Both should have same payment_id
    assert result1['payment_id'] == result2['payment_id']
```

## Node.js Implementation

```javascript
const Redis = require('ioredis');
const crypto = require('crypto');

class IdempotencyStore {
    constructor(options = {}) {
        this.redis = new Redis(options.redisUrl || 'redis://localhost:6379');
        this.keyPrefix = options.keyPrefix || 'idempotency';
        this.ttl = options.ttl || 86400;
    }

    _makeKey(idempotencyKey) {
        return `${this.keyPrefix}:${idempotencyKey}`;
    }

    async checkAndStart(idempotencyKey) {
        const key = this._makeKey(idempotencyKey);
        const now = Date.now() / 1000;

        const script = `
        local existing = redis.call('GET', KEYS[1])
        if existing then
            return existing
        end

        local record = cjson.encode({
            status = 'processing',
            created_at = ARGV[1],
            completed_at = nil,
            result = nil,
            error = nil
        })
        redis.call('SET', KEYS[1], record, 'EX', ARGV[2])
        return nil
        `;

        const result = await this.redis.eval(script, 1, key, now, this.ttl);

        if (result === null) {
            return { isNew: true, existing: null };
        }

        return { isNew: false, existing: JSON.parse(result) };
    }

    async complete(idempotencyKey, result) {
        const key = this._makeKey(idempotencyKey);
        const now = Date.now() / 1000;

        const record = {
            status: 'completed',
            created_at: now,
            completed_at: now,
            result,
            error: null
        };

        await this.redis.set(key, JSON.stringify(record), 'EX', this.ttl);
    }

    async fail(idempotencyKey, error) {
        const key = this._makeKey(idempotencyKey);
        const now = Date.now() / 1000;

        const record = {
            status: 'failed',
            created_at: now,
            completed_at: now,
            result: null,
            error
        };

        await this.redis.set(key, JSON.stringify(record), 'EX', this.ttl);
    }

    async close() {
        await this.redis.quit();
    }
}

// Express middleware
function idempotencyMiddleware(store, options = {}) {
    const headerName = options.headerName || 'X-Idempotency-Key';
    const retryAfter = options.retryAfter || 60;

    return async (req, res, next) => {
        if (req.method === 'GET') {
            return next();
        }

        const idempotencyKey = req.headers[headerName.toLowerCase()];

        if (!idempotencyKey) {
            return next();
        }

        const { isNew, existing } = await store.checkAndStart(idempotencyKey);

        if (!isNew) {
            if (existing.status === 'completed') {
                res.set('X-Idempotency-Replayed', 'true');
                return res.json(existing.result);
            }

            if (existing.status === 'processing') {
                res.set('Retry-After', retryAfter);
                return res.status(409).json({
                    error: 'Request is being processed'
                });
            }

            if (existing.status === 'failed') {
                return res.status(422).json({
                    error: `Previous request failed: ${existing.error}`
                });
            }
        }

        // Store original json method
        const originalJson = res.json.bind(res);

        res.json = async (data) => {
            await store.complete(idempotencyKey, data);
            return originalJson(data);
        };

        next();
    };
}

// Usage with Express
const express = require('express');
const app = express();

const store = new IdempotencyStore();
app.use(express.json());
app.use(idempotencyMiddleware(store));

app.post('/payments', async (req, res) => {
    // Simulate payment processing
    const paymentId = crypto.randomUUID();

    res.json({
        paymentId,
        amount: req.body.amount,
        status: 'completed'
    });
});

// Test
async function test() {
    const store = new IdempotencyStore();

    async function createPayment(amount) {
        return {
            paymentId: crypto.randomUUID(),
            amount,
            status: 'completed'
        };
    }

    const key = 'payment-123';

    // First request
    let { isNew } = await store.checkAndStart(key);
    console.log('First request isNew:', isNew);

    const result = await createPayment(100);
    await store.complete(key, result);
    console.log('First result:', result);

    // Second request
    ({ isNew, existing } = await store.checkAndStart(key));
    console.log('Second request isNew:', isNew);
    console.log('Cached result:', existing.result);

    await store.close();
}

test().catch(console.error);
```

## Best Practices

1. **Use client-provided keys**: Let clients generate idempotency keys
2. **Set appropriate TTL**: Balance between safety and storage
3. **Handle processing state**: Detect and handle stuck requests
4. **Return cached responses**: Include replay indicator header
5. **Scope keys properly**: Include user/tenant context
6. **Document requirements**: Specify which endpoints require keys

## Common Patterns

### Payment Processing

```python
def process_payment(idempotency_key, amount, card_token):
    store = IdempotencyStore(ttl=7 * 86400)  # 7 days for payments
    op = IdempotentOperation(store)

    def _process():
        charge = stripe.Charge.create(
            amount=amount,
            source=card_token,
            idempotency_key=idempotency_key
        )
        return {'charge_id': charge.id, 'status': charge.status}

    return op.execute(idempotency_key, _process)
```

### Order Creation

```python
def create_order(idempotency_key, user_id, items):
    key = f"order:{user_id}:{idempotency_key}"
    store = IdempotencyStore()
    op = IdempotentOperation(store)

    def _create():
        order = Order.create(user_id=user_id, items=items)
        return {'order_id': order.id, 'total': order.total}

    return op.execute(key, _create)
```

## Conclusion

Idempotency keys are essential for building reliable APIs that handle retries safely. Redis provides the perfect foundation with its atomic operations and automatic expiration. By implementing proper idempotency handling, you protect against duplicate transactions, improve client retry safety, and build more resilient distributed systems.
