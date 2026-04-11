# How to Implement Transaction Deduplication with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Transaction Deduplication, Idempotency, Financial, Atomic Operation

Description: Implement transaction deduplication with Redis to prevent double charges and duplicate financial transactions using idempotency keys and atomic operations.

---

## Overview

Financial transaction deduplication prevents duplicate charges caused by network retries, client bugs, or double-click submissions. Unlike general request deduplication, financial deduplication requires extra care: atomic operations, durable storage, and careful handling of concurrent submissions of the same transaction.

## Core Deduplication Setup

```python
import json
import time
import hashlib
from redis import Redis

r = Redis(host='localhost', port=6379, decode_responses=True)

DEDUP_TTL = 86400  # 24 hours - matches payment processor idempotency window
LOCK_TTL = 30      # 30 second processing lock

def generate_transaction_key(
    user_id: str,
    amount: int,  # in cents
    currency: str,
    merchant_id: str,
    client_ref: str = None
) -> str:
    """Generate deterministic deduplication key from transaction parameters."""
    if client_ref:
        # Use explicit client reference if provided
        return f"txdedup:{client_ref}"

    # Generate from transaction content for auto-dedup
    canonical = f"{user_id}:{amount}:{currency}:{merchant_id}"
    digest = hashlib.sha256(canonical.encode()).hexdigest()[:20]
    return f"txdedup:{digest}"
```

## Atomic Transaction Processing

```python
DEDUP_SCRIPT = """
local key = KEYS[1]
local lock_key = KEYS[2]
local lock_ttl = tonumber(ARGV[1])
local dedup_ttl = tonumber(ARGV[2])
local tx_data = ARGV[3]

-- Check for completed transaction first
local existing = redis.call('GET', key)
if existing then
    return existing
end

-- Check for in-progress lock
local lock_exists = redis.call('GET', lock_key)
if lock_exists then
    return 'PROCESSING'
end

-- Acquire lock
redis.call('SET', lock_key, '1', 'EX', lock_ttl)
return 'PROCEED'
"""

def process_transaction(
    dedup_key: str,
    tx_data: dict,
    processor_fn
) -> dict:
    """
    Process a financial transaction with deduplication.
    Returns cached result for duplicate calls.
    """
    lock_key = f"{dedup_key}:lock"
    dedup_fn = r.register_script(DEDUP_SCRIPT)

    result = dedup_fn(
        keys=[dedup_key, lock_key],
        args=[LOCK_TTL, DEDUP_TTL, json.dumps(tx_data)]
    )

    if result == "PROCESSING":
        # Wait briefly and retry
        time.sleep(0.5)
        cached = r.get(dedup_key)
        if cached:
            return {**json.loads(cached), "duplicate": True}
        return {"status": "pending", "message": "Transaction still processing"}

    if result != "PROCEED":
        # Cached result from previous successful transaction
        return {**json.loads(result), "duplicate": True}

    # Execute the actual transaction
    try:
        tx_result = processor_fn(tx_data)
        success_data = {
            "status": "success",
            "transaction_id": tx_result.get("id"),
            "amount": tx_data.get("amount"),
            "currency": tx_data.get("currency"),
            "processed_at": int(time.time()),
            **tx_result
        }
        # Store result and release lock
        pipe = r.pipeline()
        pipe.set(dedup_key, json.dumps(success_data), ex=DEDUP_TTL)
        pipe.delete(lock_key)
        pipe.execute()
        return success_data

    except Exception as e:
        # Release lock on failure to allow retry
        r.delete(lock_key)
        raise
```

## Payment Charge Example

```python
def charge_card(
    user_id: str,
    amount_cents: int,
    currency: str,
    card_token: str,
    order_id: str,
    idempotency_key: str = None
) -> dict:
    """Charge a card with deduplication."""
    dedup_key = generate_transaction_key(
        user_id=user_id,
        amount=amount_cents,
        currency=currency,
        merchant_id="default",
        client_ref=idempotency_key or order_id
    )

    tx_data = {
        "user_id": user_id,
        "amount": amount_cents,
        "currency": currency,
        "card_token": card_token,
        "order_id": order_id
    }

    def execute_charge(data: dict) -> dict:
        """Call payment processor (stub)."""
        # This would call Stripe, Braintree, etc.
        charge_id = f"ch_{int(time.time())}_{user_id[:6]}"
        return {
            "id": charge_id,
            "object": "charge",
            "paid": True
        }

    return process_transaction(dedup_key, tx_data, execute_charge)

# First call - charges the card
result1 = charge_card("user_123", 9999, "usd", "tok_abc", "order_xyz")
# {"status": "success", "transaction_id": "ch_...", ...}

# Retry (e.g. network timeout) - returns cached result, no second charge
result2 = charge_card("user_123", 9999, "usd", "tok_abc", "order_xyz")
# {"status": "success", "transaction_id": "ch_...", "duplicate": True}
```

## Tracking Duplicate Attempts

```python
def track_duplicate_attempt(dedup_key: str, attempt_data: dict):
    """Log duplicate attempt for audit and fraud analysis."""
    audit_key = f"{dedup_key}:attempts"
    entry = {
        "timestamp": int(time.time()),
        "attempt": attempt_data
    }
    r.rpush(audit_key, json.dumps(entry))
    r.expire(audit_key, DEDUP_TTL)

def get_transaction_attempts(dedup_key: str) -> list[dict]:
    """Get all attempts for a dedup key (for debugging)."""
    raw = r.lrange(f"{dedup_key}:attempts", 0, -1)
    return [json.loads(a) for a in raw]
```

## Refund Deduplication

```python
def process_refund(
    original_tx_id: str,
    amount_cents: int,
    reason: str,
    idempotency_key: str = None
) -> dict:
    """Process a refund with deduplication."""
    ref_key = idempotency_key or f"refund:{original_tx_id}:{amount_cents}"
    dedup_key = f"txdedup:refund:{hashlib.sha256(ref_key.encode()).hexdigest()[:20]}"

    def execute_refund(data: dict) -> dict:
        refund_id = f"re_{int(time.time())}"
        return {"id": refund_id, "status": "succeeded", "amount": data["amount"]}

    return process_transaction(
        dedup_key,
        {"original_tx_id": original_tx_id, "amount": amount_cents, "reason": reason},
        execute_refund
    )
```

## Summary

Redis-based transaction deduplication uses atomic Lua scripts to guarantee that concurrent submissions of the same transaction result in exactly one charge. The three-state system (PROCEED, PROCESSING, cached result) handles all scenarios: first submission, concurrent retries during processing, and post-completion retries. TTLs matching the payment processor's idempotency window ensure the cache remains valid for legitimate retries while expiring naturally to free memory.
