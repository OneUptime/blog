# How to Implement Request Deduplication with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Request Deduplication, Idempotency, Microservices, Exactly-Once, Distributed Systems

Description: A comprehensive guide to implementing request deduplication with Redis for exactly-once processing semantics in distributed microservices architectures.

---

Request deduplication ensures that duplicate requests (from retries, network issues, or client bugs) are processed only once. Redis provides fast, atomic operations ideal for implementing idempotency in distributed systems.

## Why Request Deduplication?

Duplicate requests occur due to:

- **Network retries**: Client retries after timeout
- **User actions**: Double-clicking submit buttons
- **Message redelivery**: Queue systems delivering twice
- **Failover**: Requests replayed during failover

Without deduplication, you risk:

- Duplicate payments or orders
- Incorrect inventory counts
- Duplicate notifications
- Data inconsistencies

## Pattern 1: Idempotency Key Storage

Store idempotency keys with results:

```python
import redis
import json
import hashlib
import time
from typing import Dict, Any, Optional, Callable
from dataclasses import dataclass, asdict
from functools import wraps
import logging

logger = logging.getLogger(__name__)

@dataclass
class IdempotencyRecord:
    idempotency_key: str
    request_hash: str
    status: str  # pending, completed, failed
    response: Optional[Dict] = None
    created_at: float = 0
    completed_at: Optional[float] = None

class IdempotencyStore:
    def __init__(self, redis_client: redis.Redis, ttl: int = 86400):
        self.redis = redis_client
        self.ttl = ttl  # 24 hours default
        self._prefix = "idempotency"

    def _key(self, idempotency_key: str) -> str:
        return f"{self._prefix}:{idempotency_key}"

    def _hash_request(self, request_data: Dict) -> str:
        """Create hash of request for conflict detection."""
        serialized = json.dumps(request_data, sort_keys=True)
        return hashlib.sha256(serialized.encode()).hexdigest()[:32]

    def check_and_start(self, idempotency_key: str,
                        request_data: Dict) -> tuple:
        """
        Check if request is duplicate and start processing if new.
        Returns: (is_duplicate, existing_record or None)
        """
        key = self._key(idempotency_key)
        request_hash = self._hash_request(request_data)

        # Try to set with NX (only if not exists)
        record = IdempotencyRecord(
            idempotency_key=idempotency_key,
            request_hash=request_hash,
            status="pending",
            created_at=time.time()
        )

        # Use SET NX with Lua for atomicity
        script = """
        local existing = redis.call('GET', KEYS[1])
        if existing then
            return existing
        else
            redis.call('SETEX', KEYS[1], ARGV[2], ARGV[1])
            return nil
        end
        """

        result = self.redis.eval(
            script,
            1,
            key,
            json.dumps(asdict(record)),
            self.ttl
        )

        if result:
            # Duplicate request found
            existing = IdempotencyRecord(**json.loads(result))

            # Verify request hash matches
            if existing.request_hash != request_hash:
                raise IdempotencyConflictError(
                    f"Idempotency key {idempotency_key} used with different request"
                )

            return True, existing

        return False, None

    def complete(self, idempotency_key: str, response: Dict):
        """Mark request as completed with response."""
        key = self._key(idempotency_key)

        # Get existing record
        data = self.redis.get(key)
        if not data:
            logger.warning(f"No record found for {idempotency_key}")
            return

        record = IdempotencyRecord(**json.loads(data))
        record.status = "completed"
        record.response = response
        record.completed_at = time.time()

        self.redis.setex(key, self.ttl, json.dumps(asdict(record)))

    def fail(self, idempotency_key: str, error: str):
        """Mark request as failed."""
        key = self._key(idempotency_key)

        data = self.redis.get(key)
        if not data:
            return

        record = IdempotencyRecord(**json.loads(data))
        record.status = "failed"
        record.response = {"error": error}
        record.completed_at = time.time()

        self.redis.setex(key, self.ttl, json.dumps(asdict(record)))

    def get(self, idempotency_key: str) -> Optional[IdempotencyRecord]:
        """Get idempotency record."""
        key = self._key(idempotency_key)
        data = self.redis.get(key)

        if data:
            return IdempotencyRecord(**json.loads(data))
        return None

    def delete(self, idempotency_key: str):
        """Delete idempotency record (for testing or cleanup)."""
        key = self._key(idempotency_key)
        self.redis.delete(key)

class IdempotencyConflictError(Exception):
    pass

# Decorator for idempotent operations
def idempotent(store: IdempotencyStore,
               key_extractor: Callable[[Dict], str] = None):
    """Decorator to make a function idempotent."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(request_data: Dict, *args, **kwargs):
            # Extract idempotency key
            if key_extractor:
                idempotency_key = key_extractor(request_data)
            else:
                idempotency_key = request_data.get('idempotency_key')

            if not idempotency_key:
                raise ValueError("Idempotency key required")

            # Check for duplicate
            is_duplicate, existing = store.check_and_start(
                idempotency_key, request_data
            )

            if is_duplicate:
                if existing.status == "completed":
                    logger.info(f"Returning cached response for {idempotency_key}")
                    return existing.response
                elif existing.status == "pending":
                    raise RequestInProgressError(
                        f"Request {idempotency_key} is still processing"
                    )
                elif existing.status == "failed":
                    # Allow retry of failed requests
                    pass

            # Execute the function
            try:
                result = func(request_data, *args, **kwargs)
                store.complete(idempotency_key, result)
                return result
            except Exception as e:
                store.fail(idempotency_key, str(e))
                raise

        return wrapper
    return decorator

class RequestInProgressError(Exception):
    pass

# Usage
r = redis.Redis()
idempotency_store = IdempotencyStore(r)

@idempotent(idempotency_store)
def process_payment(request_data: Dict) -> Dict:
    """Process a payment - will only execute once per idempotency key."""
    # Actual payment processing logic
    return {
        "payment_id": "pay_123",
        "status": "completed",
        "amount": request_data["amount"]
    }

# Process payment with idempotency
result = process_payment({
    "idempotency_key": "order_456_payment",
    "amount": 99.99,
    "currency": "USD"
})
```

## Pattern 2: Request Fingerprinting

Deduplicate based on request content:

```python
import redis
import json
import hashlib
import time
from typing import Dict, Any, Optional, List
import logging

logger = logging.getLogger(__name__)

class RequestDeduplicator:
    def __init__(self, redis_client: redis.Redis, window: int = 300):
        self.redis = redis_client
        self.window = window  # Deduplication window in seconds
        self._prefix = "dedup"

    def _generate_fingerprint(self, request: Dict,
                              include_fields: List[str] = None,
                              exclude_fields: List[str] = None) -> str:
        """Generate fingerprint from request data."""
        data = request.copy()

        # Filter fields
        if include_fields:
            data = {k: v for k, v in data.items() if k in include_fields}
        elif exclude_fields:
            data = {k: v for k, v in data.items() if k not in exclude_fields}

        # Remove dynamic fields that shouldn't affect fingerprint
        data.pop('timestamp', None)
        data.pop('request_id', None)

        serialized = json.dumps(data, sort_keys=True)
        return hashlib.sha256(serialized.encode()).hexdigest()

    def _key(self, fingerprint: str) -> str:
        return f"{self._prefix}:{fingerprint}"

    def is_duplicate(self, request: Dict,
                     include_fields: List[str] = None,
                     exclude_fields: List[str] = None) -> tuple:
        """
        Check if request is duplicate.
        Returns: (is_duplicate, fingerprint)
        """
        fingerprint = self._generate_fingerprint(
            request, include_fields, exclude_fields
        )
        key = self._key(fingerprint)

        # Check if exists
        existing = self.redis.get(key)

        if existing:
            return True, fingerprint

        return False, fingerprint

    def mark_processed(self, fingerprint: str, result: Any = None):
        """Mark request as processed."""
        key = self._key(fingerprint)

        data = {
            "processed_at": time.time(),
            "result": result
        }

        self.redis.setex(key, self.window, json.dumps(data))

    def get_cached_result(self, fingerprint: str) -> Optional[Any]:
        """Get cached result for fingerprint."""
        key = self._key(fingerprint)
        data = self.redis.get(key)

        if data:
            parsed = json.loads(data)
            return parsed.get("result")
        return None

    def deduplicate(self, request: Dict,
                    processor: callable,
                    include_fields: List[str] = None,
                    exclude_fields: List[str] = None) -> tuple:
        """
        Process request with deduplication.
        Returns: (result, was_duplicate)
        """
        is_dup, fingerprint = self.is_duplicate(
            request, include_fields, exclude_fields
        )

        if is_dup:
            cached = self.get_cached_result(fingerprint)
            if cached:
                logger.info(f"Returning cached result for {fingerprint[:16]}")
                return cached, True
            # Duplicate but no result - request might be in progress
            raise DuplicateInProgressError(fingerprint)

        # Process new request
        result = processor(request)
        self.mark_processed(fingerprint, result)

        return result, False

class DuplicateInProgressError(Exception):
    def __init__(self, fingerprint: str):
        self.fingerprint = fingerprint
        super().__init__(f"Duplicate request in progress: {fingerprint[:16]}")

# Usage
deduplicator = RequestDeduplicator(redis.Redis(), window=300)

def process_order(request: Dict) -> Dict:
    """Process order."""
    return {"order_id": "ord_123", "status": "created"}

# Deduplicate based on customer and items only
result, was_dup = deduplicator.deduplicate(
    request={
        "customer_id": "cust_123",
        "items": [{"product_id": "prod_1", "qty": 2}],
        "timestamp": time.time()  # Ignored in fingerprint
    },
    processor=process_order,
    include_fields=["customer_id", "items"]
)
```

## Pattern 3: Sliding Window Deduplication

Deduplicate within a time window:

```python
import redis
import json
import hashlib
import time
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class SlidingWindowDeduplicator:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self._prefix = "dedup_window"

    def _request_key(self, entity_type: str, entity_id: str) -> str:
        return f"{self._prefix}:{entity_type}:{entity_id}"

    def is_duplicate_in_window(self, entity_type: str, entity_id: str,
                               action: str, window_seconds: int,
                               request_data: Dict = None) -> bool:
        """Check if same action occurred within window."""
        key = self._request_key(entity_type, entity_id)
        now = time.time()
        window_start = now - window_seconds

        # Generate action hash
        if request_data:
            action_hash = hashlib.sha256(
                json.dumps(request_data, sort_keys=True).encode()
            ).hexdigest()[:16]
            member = f"{action}:{action_hash}"
        else:
            member = action

        # Check if action exists in window
        script = """
        -- Remove old entries
        redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])

        -- Check if member exists
        local score = redis.call('ZSCORE', KEYS[1], ARGV[2])

        if score then
            return 1
        else
            -- Add new entry
            redis.call('ZADD', KEYS[1], ARGV[3], ARGV[2])
            redis.call('EXPIRE', KEYS[1], ARGV[4])
            return 0
        end
        """

        result = self.redis.eval(
            script,
            1,
            key,
            window_start,
            member,
            now,
            window_seconds * 2
        )

        return bool(result)

    def clear_action(self, entity_type: str, entity_id: str,
                     action: str, request_data: Dict = None):
        """Clear a specific action from window."""
        key = self._request_key(entity_type, entity_id)

        if request_data:
            action_hash = hashlib.sha256(
                json.dumps(request_data, sort_keys=True).encode()
            ).hexdigest()[:16]
            member = f"{action}:{action_hash}"
        else:
            member = action

        self.redis.zrem(key, member)

# Usage
window_dedup = SlidingWindowDeduplicator(redis.Redis())

# Prevent duplicate email sends within 5 minutes
if not window_dedup.is_duplicate_in_window(
    "user", "123",
    "send_welcome_email",
    window_seconds=300
):
    send_welcome_email(user_id="123")
else:
    logger.info("Skipping duplicate email send")
```

## Pattern 4: Exactly-Once Message Processing

Implement exactly-once semantics for message consumers:

```python
import redis
import json
import time
from typing import Dict, Any, Callable, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class ProcessedMessage:
    message_id: str
    processed_at: float
    result: Optional[Dict]
    status: str

class ExactlyOnceProcessor:
    def __init__(self, redis_client: redis.Redis, consumer_name: str,
                 ttl: int = 86400):
        self.redis = redis_client
        self.consumer_name = consumer_name
        self.ttl = ttl
        self._prefix = f"exactly_once:{consumer_name}"

    def _message_key(self, message_id: str) -> str:
        return f"{self._prefix}:{message_id}"

    def _lock_key(self, message_id: str) -> str:
        return f"{self._prefix}:lock:{message_id}"

    def process_message(self, message_id: str, message: Dict,
                        handler: Callable[[Dict], Dict]) -> tuple:
        """
        Process message exactly once.
        Returns: (result, was_duplicate)
        """
        message_key = self._message_key(message_id)
        lock_key = self._lock_key(message_id)

        # Check if already processed
        existing = self.redis.get(message_key)
        if existing:
            record = ProcessedMessage(**json.loads(existing))
            if record.status == "completed":
                return record.result, True
            # If failed or pending, try to reprocess

        # Try to acquire lock
        lock_acquired = self.redis.set(
            lock_key, "1", nx=True, ex=60
        )

        if not lock_acquired:
            # Another consumer is processing
            raise MessageLockedError(message_id)

        try:
            # Double-check after acquiring lock
            existing = self.redis.get(message_key)
            if existing:
                record = ProcessedMessage(**json.loads(existing))
                if record.status == "completed":
                    return record.result, True

            # Mark as processing
            self._save_record(message_id, ProcessedMessage(
                message_id=message_id,
                processed_at=time.time(),
                result=None,
                status="processing"
            ))

            # Process message
            result = handler(message)

            # Mark as completed
            self._save_record(message_id, ProcessedMessage(
                message_id=message_id,
                processed_at=time.time(),
                result=result,
                status="completed"
            ))

            return result, False

        except Exception as e:
            # Mark as failed
            self._save_record(message_id, ProcessedMessage(
                message_id=message_id,
                processed_at=time.time(),
                result={"error": str(e)},
                status="failed"
            ))
            raise

        finally:
            self.redis.delete(lock_key)

    def _save_record(self, message_id: str, record: ProcessedMessage):
        """Save processing record."""
        from dataclasses import asdict
        key = self._message_key(message_id)
        self.redis.setex(key, self.ttl, json.dumps(asdict(record)))

    def was_processed(self, message_id: str) -> bool:
        """Check if message was already processed."""
        key = self._message_key(message_id)
        existing = self.redis.get(key)

        if existing:
            record = ProcessedMessage(**json.loads(existing))
            return record.status == "completed"

        return False

class MessageLockedError(Exception):
    def __init__(self, message_id: str):
        self.message_id = message_id
        super().__init__(f"Message {message_id} is being processed")

# Usage with message queue
processor = ExactlyOnceProcessor(redis.Redis(), "order-processor")

def handle_order_message(message: Dict) -> Dict:
    """Process order message."""
    order_id = message["order_id"]
    # Process order...
    return {"order_id": order_id, "status": "processed"}

# Consume from queue
def consume_messages(queue):
    for message in queue:
        try:
            result, was_dup = processor.process_message(
                message_id=message["id"],
                message=message["data"],
                handler=handle_order_message
            )

            if was_dup:
                logger.info(f"Skipped duplicate: {message['id']}")
            else:
                logger.info(f"Processed: {message['id']}")

            queue.ack(message["id"])

        except MessageLockedError:
            # Requeue for later
            queue.requeue(message["id"])
```

## Pattern 5: Client-Side Deduplication Token

Generate and validate deduplication tokens:

```python
import redis
import json
import secrets
import time
import hmac
import hashlib
from typing import Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class DeduplicationTokenService:
    def __init__(self, redis_client: redis.Redis, secret_key: str):
        self.redis = redis_client
        self.secret_key = secret_key.encode()
        self._prefix = "dedup_token"

    def generate_token(self, context: Dict, ttl: int = 300) -> str:
        """Generate a deduplication token for client."""
        # Create token data
        token_id = secrets.token_hex(16)
        timestamp = time.time()

        token_data = {
            "id": token_id,
            "context": context,
            "timestamp": timestamp,
            "ttl": ttl
        }

        # Create signature
        payload = json.dumps(token_data, sort_keys=True)
        signature = hmac.new(
            self.secret_key,
            payload.encode(),
            hashlib.sha256
        ).hexdigest()

        # Store token
        key = f"{self._prefix}:{token_id}"
        self.redis.setex(key, ttl, json.dumps({
            "context": context,
            "used": False
        }))

        # Return token with signature
        return f"{token_id}.{signature}"

    def validate_and_use(self, token: str,
                         request_context: Dict) -> Tuple[bool, str]:
        """
        Validate and consume deduplication token.
        Returns: (is_valid, reason)
        """
        try:
            token_id, signature = token.split(".", 1)
        except ValueError:
            return False, "Invalid token format"

        key = f"{self._prefix}:{token_id}"

        # Atomic check-and-mark-used
        script = """
        local data = redis.call('GET', KEYS[1])
        if not data then
            return {0, 'Token expired or not found'}
        end

        local token_data = cjson.decode(data)
        if token_data.used then
            return {0, 'Token already used'}
        end

        -- Mark as used
        token_data.used = true
        token_data.used_at = ARGV[1]
        redis.call('SET', KEYS[1], cjson.encode(token_data))
        redis.call('EXPIRE', KEYS[1], 86400)  -- Keep for audit

        return {1, cjson.encode(token_data.context)}
        """

        result = self.redis.eval(script, 1, key, time.time())

        if not result[0]:
            return False, result[1].decode() if isinstance(result[1], bytes) else result[1]

        # Verify context matches
        stored_context = json.loads(result[1])

        # Check relevant context fields match
        for k, v in stored_context.items():
            if k in request_context and request_context[k] != v:
                return False, f"Context mismatch: {k}"

        return True, "Valid"

    def check_token_status(self, token: str) -> Dict:
        """Check token status without consuming it."""
        try:
            token_id, _ = token.split(".", 1)
        except ValueError:
            return {"valid": False, "reason": "Invalid format"}

        key = f"{self._prefix}:{token_id}"
        data = self.redis.get(key)

        if not data:
            return {"valid": False, "reason": "Not found or expired"}

        token_data = json.loads(data)
        return {
            "valid": True,
            "used": token_data.get("used", False),
            "context": token_data.get("context")
        }

# Flask integration example
from flask import Flask, request, jsonify

app = Flask(__name__)
redis_client = redis.Redis()
token_service = DeduplicationTokenService(redis_client, "your-secret-key")

@app.route('/api/tokens', methods=['POST'])
def create_token():
    """Create deduplication token for form submission."""
    context = {
        "user_id": request.json.get("user_id"),
        "action": request.json.get("action")
    }

    token = token_service.generate_token(context, ttl=300)
    return jsonify({"token": token})

@app.route('/api/orders', methods=['POST'])
def create_order():
    """Create order with deduplication."""
    token = request.headers.get('X-Dedup-Token')

    if not token:
        return jsonify({"error": "Deduplication token required"}), 400

    context = {
        "user_id": request.json.get("user_id"),
        "action": "create_order"
    }

    is_valid, reason = token_service.validate_and_use(token, context)

    if not is_valid:
        return jsonify({"error": f"Invalid token: {reason}"}), 409

    # Process order...
    return jsonify({"order_id": "ord_123", "status": "created"})
```

## Best Practices

1. **Choose appropriate TTL** - Long enough for retries, short enough to not waste memory
2. **Handle in-progress requests** - Return appropriate status or wait
3. **Verify request content** - Same key should have same request
4. **Clean up old records** - Use Redis TTL or scheduled cleanup
5. **Log duplicates** - Track duplicate patterns for debugging
6. **Make handlers idempotent** - Even with deduplication, handlers should be safe to retry
7. **Test failure scenarios** - Verify behavior when Redis is down

## Conclusion

Request deduplication with Redis provides exactly-once processing semantics in distributed systems. Choose the appropriate pattern based on your requirements: idempotency keys for explicit client control, fingerprinting for automatic deduplication, or exactly-once processing for message consumers. Always combine deduplication with idempotent handlers for maximum reliability.
