# How to Use Redis Transactions (MULTI/EXEC) in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Python, Transaction, MULTI, EXEC, Watch, Atomicity

Description: Learn how to use Redis MULTI/EXEC transactions in Python with redis-py, including WATCH for optimistic locking and error handling patterns.

---

## Understanding Redis Transactions

Redis transactions use `MULTI` and `EXEC` to batch commands atomically. All queued commands execute sequentially without interruption from other clients. Key characteristics:

- Commands queued after `MULTI` are executed atomically on `EXEC`
- Syntax errors during queuing cause the entire transaction to be discarded on `EXEC`
- Runtime errors in individual commands do **not** roll back other commands - unlike relational databases, there is no rollback
- `DISCARD` cancels the queued transaction

## Basic MULTI/EXEC Transaction

In redis-py, `pipeline(transaction=True)` wraps commands in `MULTI/EXEC`:

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

with r.pipeline(transaction=True) as pipe:
    pipe.set('account:alice:balance', '1000')
    pipe.set('account:bob:balance', '500')
    results = pipe.execute()

print(results)  # [True, True]
```

## Transferring Funds Atomically

A classic use case - debit one account and credit another atomically:

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def transfer_funds(from_account, to_account, amount):
    with r.pipeline(transaction=True) as pipe:
        # Get current balances
        from_balance = float(r.get(from_account) or 0)
        to_balance = float(r.get(to_account) or 0)

        if from_balance < amount:
            raise ValueError(f"Insufficient funds: {from_balance} < {amount}")

        # Queue the atomic transfer
        pipe.set(from_account, from_balance - amount)
        pipe.set(to_account, to_balance + amount)
        results = pipe.execute()

    return results

transfer_funds('account:alice:balance', 'account:bob:balance', 100)
```

> **Note:** This example has a race condition. The balances are read outside the transaction via `r.get()`, so another client could modify them before `execute()` runs. Use `WATCH` (shown below) for safe read-then-write operations.

## Using WATCH for Optimistic Locking

`WATCH` allows you to abort a transaction if a key changes between watching it and executing. This is "check-and-set" (CAS) behavior:

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def safe_transfer(from_account, to_account, amount):
    with r.pipeline() as pipe:
        while True:
            try:
                # Watch keys for changes
                pipe.watch(from_account, to_account)

                from_balance = float(pipe.get(from_account) or 0)
                to_balance = float(pipe.get(to_account) or 0)

                if from_balance < amount:
                    pipe.unwatch()
                    raise ValueError(f"Insufficient funds: {from_balance}")

                # Queue commands in MULTI block
                pipe.multi()
                pipe.set(from_account, from_balance - amount)
                pipe.set(to_account, to_balance + amount)

                # Execute - will fail if watched keys changed
                pipe.execute()
                print("Transfer successful")
                break

            except redis.WatchError:
                # Another client modified the watched keys
                print("Conflict detected, retrying...")
                continue

safe_transfer('account:alice:balance', 'account:bob:balance', 50)
```

## Atomic Counter Increment with Bounds Checking

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def increment_with_limit(counter_key, max_value):
    with r.pipeline() as pipe:
        while True:
            try:
                pipe.watch(counter_key)
                current = int(pipe.get(counter_key) or 0)

                if current >= max_value:
                    pipe.unwatch()
                    return False, current

                pipe.multi()
                pipe.incr(counter_key)
                result = pipe.execute()
                return True, result[0]

            except redis.WatchError:
                continue

# Allow max 100 requests per user
success, count = increment_with_limit('user:123:requests', 100)
if not success:
    print("Rate limit exceeded")
```

## DISCARD - Cancelling a Transaction

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

pipe = r.pipeline(transaction=True)

try:
    pipe.set('key1', 'value1')
    pipe.set('key2', 'value2')

    # Simulate an error condition
    if some_error_condition:
        pipe.reset()  # Clears the queued commands
        print("Transaction cancelled")
    else:
        pipe.execute()
except Exception as e:
    pipe.reset()
    print(f"Error: {e}")
```

## Queuing Commands with Error Handling

```python
import redis
from redis.exceptions import ResponseError

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Set up test data
r.set('string_key', 'hello')

with r.pipeline(transaction=True) as pipe:
    pipe.set('new_key', 'value')
    # This will fail at execute time (wrong type)
    pipe.lpush('string_key', 'item')
    pipe.incr('counter')

    # Use raise_on_error=False to get all results including errors
    results = pipe.execute(raise_on_error=False)
    for i, result in enumerate(results):
        if isinstance(result, ResponseError):
            print(f"Command {i} failed: {result}")
        else:
            print(f"Command {i} succeeded: {result}")
```

## Atomic Inventory Management

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def reserve_inventory(product_id, quantity):
    inventory_key = f'inventory:{product_id}'
    reserved_key = f'reserved:{product_id}'

    with r.pipeline() as pipe:
        while True:
            try:
                pipe.watch(inventory_key)
                available = int(pipe.get(inventory_key) or 0)

                if available < quantity:
                    pipe.unwatch()
                    return False, "Insufficient inventory"

                pipe.multi()
                pipe.decrby(inventory_key, quantity)
                pipe.incrby(reserved_key, quantity)
                pipe.execute()
                return True, f"Reserved {quantity} units"

            except redis.WatchError:
                continue

success, message = reserve_inventory('product:42', 5)
print(message)
```

## Summary

Redis transactions in Python use `pipeline(transaction=True)` for basic MULTI/EXEC atomicity, and `WATCH` for optimistic locking when you need to read-then-write safely. The retry loop pattern with `WatchError` handling is the idiomatic way to implement check-and-set operations in redis-py. Remember that Redis transactions prevent interleaving from other clients but do not roll back individual command errors within the transaction.
