# How to Use Redis Transactions with MULTI/EXEC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Transactions, MULTI, EXEC, Atomicity, WATCH, Optimistic Locking, Python, Node.js

Description: A comprehensive guide to Redis transactions using MULTI/EXEC commands. Learn atomic operations, optimistic locking with WATCH, error handling, and when to use transactions vs Lua scripts.

---

> Redis transactions provide a way to execute multiple commands as a single atomic operation. Using MULTI/EXEC, you can batch commands together, ensuring they execute sequentially without interruption from other clients. Combined with WATCH, you get optimistic locking for complex read-modify-write patterns.

This guide covers Redis transaction fundamentals, practical patterns, error handling, and when to choose transactions over alternatives like Lua scripts.

---

## Understanding Redis Transactions

### How MULTI/EXEC Works

```
Normal Execution (commands interleaved):
─────────────────────────────────────────────────────
Client A: SET balance:A 100
Client B: GET balance:A                    <- sees 100
Client A: SET balance:B 200
Client B: SET balance:A 50                 <- overwrites!

Transaction Execution (atomic block):
─────────────────────────────────────────────────────
Client A: MULTI
Client A: SET balance:A 100     <- queued
Client A: SET balance:B 200     <- queued
Client A: EXEC                  <- all execute atomically
Client B: GET balance:A         <- waits until EXEC completes
```

### Transaction Commands

```bash
# Basic transaction flow
MULTI                  # Start transaction
SET key1 value1       # Queue command (returns QUEUED)
SET key2 value2       # Queue command (returns QUEUED)
INCR counter          # Queue command (returns QUEUED)
EXEC                  # Execute all queued commands

# Discard transaction
MULTI
SET key value
DISCARD              # Cancel transaction, discard queued commands

# Watch keys for optimistic locking
WATCH key1 key2      # Watch keys for changes
MULTI
SET key1 newvalue
EXEC                 # Returns nil if watched keys changed
```

---

## Basic Transactions

### Python with redis-py

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Basic transaction
def transfer_funds(from_account, to_account, amount):
    """Transfer funds between accounts atomically"""
    pipe = r.pipeline()  # Creates transaction by default

    pipe.decrby(f"balance:{from_account}", amount)
    pipe.incrby(f"balance:{to_account}", amount)

    # Execute returns list of results
    results = pipe.execute()

    return results  # [new_balance_from, new_balance_to]

# Setup
r.set("balance:A", 1000)
r.set("balance:B", 500)

# Transfer
results = transfer_funds("A", "B", 100)
print(f"New balances: A={r.get('balance:A')}, B={r.get('balance:B')}")
# Output: New balances: A=900, B=600
```

### Node.js with ioredis

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function transferFunds(fromAccount, toAccount, amount) {
    // multi() starts a transaction
    const results = await redis.multi()
        .decrby(`balance:${fromAccount}`, amount)
        .incrby(`balance:${toAccount}`, amount)
        .exec();

    // results = [[null, newBalanceFrom], [null, newBalanceTo]]
    return results.map(([err, value]) => {
        if (err) throw err;
        return value;
    });
}

// Usage
await redis.set('balance:A', 1000);
await redis.set('balance:B', 500);

const [newA, newB] = await transferFunds('A', 'B', 100);
console.log(`New balances: A=${newA}, B=${newB}`);
```

### Go with go-redis

```go
package main

import (
    "context"
    "fmt"
    "github.com/redis/go-redis/v9"
)

func transferFunds(ctx context.Context, rdb *redis.Client, from, to string, amount int64) error {
    pipe := rdb.TxPipeline()

    decrCmd := pipe.DecrBy(ctx, "balance:"+from, amount)
    incrCmd := pipe.IncrBy(ctx, "balance:"+to, amount)

    _, err := pipe.Exec(ctx)
    if err != nil {
        return err
    }

    fmt.Printf("New balance %s: %d\n", from, decrCmd.Val())
    fmt.Printf("New balance %s: %d\n", to, incrCmd.Val())

    return nil
}

func main() {
    ctx := context.Background()
    rdb := redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })

    rdb.Set(ctx, "balance:A", 1000, 0)
    rdb.Set(ctx, "balance:B", 500, 0)

    transferFunds(ctx, rdb, "A", "B", 100)
}
```

---

## Optimistic Locking with WATCH

### Understanding WATCH

WATCH provides optimistic locking - the transaction only executes if watched keys haven't changed since WATCH was called.

```
With WATCH (optimistic locking):
─────────────────────────────────────────────────────
Client A: WATCH balance:A
Client A: GET balance:A        <- returns 100
Client B: SET balance:A 50     <- changes watched key
Client A: MULTI
Client A: SET balance:A 80     <- queued
Client A: EXEC                 <- returns nil (aborted!)

Transaction was aborted because balance:A changed after WATCH.
```

### Python WATCH Pattern

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def safe_increment(key, max_value):
    """
    Increment a counter only if it doesn't exceed max_value.
    Uses WATCH for optimistic locking.
    """
    while True:
        try:
            # Watch the key
            r.watch(key)

            # Read current value
            current = int(r.get(key) or 0)

            if current >= max_value:
                r.unwatch()
                return None  # Already at max

            # Start transaction
            pipe = r.pipeline(True)
            pipe.incr(key)

            # Execute - returns None if key changed
            result = pipe.execute()

            return result[0]  # New value

        except redis.WatchError:
            # Key was modified, retry
            continue

# Usage
r.set("counter", 0)

# Multiple threads can call this safely
for _ in range(10):
    result = safe_increment("counter", 5)
    if result:
        print(f"Incremented to {result}")
    else:
        print("Max reached")
```

### Node.js WATCH Pattern

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function safeIncrement(key, maxValue) {
    while (true) {
        try {
            // Watch the key
            await redis.watch(key);

            // Read current value
            const current = parseInt(await redis.get(key)) || 0;

            if (current >= maxValue) {
                await redis.unwatch();
                return null;
            }

            // Execute transaction
            const result = await redis.multi()
                .incr(key)
                .exec();

            // result is null if WATCH failed
            if (result === null) {
                continue;  // Retry
            }

            return result[0][1];  // New value

        } catch (error) {
            if (error.message.includes('EXECABORT')) {
                continue;  // Retry on watch error
            }
            throw error;
        }
    }
}

// Usage
await redis.set('counter', 0);
const result = await safeIncrement('counter', 5);
```

### Compare-and-Swap Pattern

```python
def compare_and_swap(key, expected_value, new_value):
    """
    Set key to new_value only if current value equals expected_value.
    Returns True if swap succeeded, False otherwise.
    """
    while True:
        try:
            r.watch(key)

            current = r.get(key)

            if current != expected_value:
                r.unwatch()
                return False

            pipe = r.pipeline(True)
            pipe.set(key, new_value)
            result = pipe.execute()

            return True

        except redis.WatchError:
            continue

# Usage: Only update if value is what we expect
r.set("status", "pending")

if compare_and_swap("status", "pending", "processing"):
    print("Status updated to processing")
    # Do work...
    compare_and_swap("status", "processing", "complete")
else:
    print("Status was already changed by another process")
```

---

## Common Transaction Patterns

### Atomic Counter with Limit

```python
def increment_with_limit(key, limit, expire_seconds=None):
    """
    Increment counter atomically, respecting a limit.
    Useful for rate limiting.
    """
    while True:
        try:
            r.watch(key)

            current = int(r.get(key) or 0)

            if current >= limit:
                r.unwatch()
                return None  # Limit reached

            pipe = r.pipeline(True)
            pipe.incr(key)
            if expire_seconds and current == 0:
                pipe.expire(key, expire_seconds)

            result = pipe.execute()
            return result[0]

        except redis.WatchError:
            continue

# Rate limiting example
def check_rate_limit(user_id, limit=100, window=60):
    key = f"ratelimit:{user_id}:{int(time.time()) // window}"
    result = increment_with_limit(key, limit, expire_seconds=window)
    return result is not None  # True if allowed
```

### Inventory Reservation

```python
def reserve_inventory(product_id, quantity):
    """
    Reserve inventory atomically, only if sufficient stock exists.
    """
    stock_key = f"inventory:{product_id}"
    reserved_key = f"reserved:{product_id}"

    while True:
        try:
            r.watch(stock_key)

            available = int(r.get(stock_key) or 0)

            if available < quantity:
                r.unwatch()
                return False, "Insufficient stock"

            pipe = r.pipeline(True)
            pipe.decrby(stock_key, quantity)
            pipe.incrby(reserved_key, quantity)

            result = pipe.execute()

            return True, f"Reserved {quantity} units"

        except redis.WatchError:
            continue

# Usage
r.set("inventory:SKU123", 100)

success, message = reserve_inventory("SKU123", 5)
print(message)  # "Reserved 5 units"
```

### Leaderboard Update

```python
def update_score_with_history(user_id, new_score):
    """
    Update leaderboard score and maintain history atomically.
    """
    leaderboard_key = "leaderboard:global"
    history_key = f"scores:history:{user_id}"

    while True:
        try:
            r.watch(leaderboard_key)

            # Get current score
            current_score = r.zscore(leaderboard_key, user_id)

            pipe = r.pipeline(True)

            # Update leaderboard
            pipe.zadd(leaderboard_key, {user_id: new_score})

            # Add to history
            pipe.lpush(history_key, f"{time.time()}:{new_score}")
            pipe.ltrim(history_key, 0, 99)  # Keep last 100

            # Track if it's a new high score
            if current_score is None or new_score > current_score:
                pipe.sadd(f"high_scores:{user_id}", new_score)

            result = pipe.execute()
            return True

        except redis.WatchError:
            continue
```

---

## Error Handling

### Understanding Transaction Errors

```python
# Two types of errors in transactions:

# 1. Queue-time errors (syntax errors) - Transaction is aborted
pipe = r.pipeline()
pipe.set("key", "value")
pipe.incr("key", "not_a_number")  # Wrong argument type
pipe.execute()  # Raises ResponseError

# 2. Execution-time errors - Other commands still execute
r.set("mykey", "hello")  # Set string value
pipe = r.pipeline()
pipe.incr("mykey")       # Will fail (not an integer)
pipe.set("other", "value")  # Will succeed
results = pipe.execute(raise_on_error=False)
# results[0] = ResponseError
# results[1] = True
```

### Safe Transaction Execution

```python
def safe_transaction(operations):
    """
    Execute transaction with error handling.

    Args:
        operations: List of (method_name, args, kwargs) tuples

    Returns:
        (success, results, errors)
    """
    pipe = r.pipeline()

    for method, args, kwargs in operations:
        getattr(pipe, method)(*args, **kwargs)

    results = pipe.execute(raise_on_error=False)

    successes = []
    errors = []

    for i, result in enumerate(results):
        if isinstance(result, Exception):
            errors.append({
                'index': i,
                'operation': operations[i],
                'error': str(result)
            })
        else:
            successes.append({
                'index': i,
                'operation': operations[i],
                'result': result
            })

    return len(errors) == 0, successes, errors

# Usage
operations = [
    ('set', ('key1', 'value1'), {}),
    ('incr', ('string_key',), {}),  # May fail if not integer
    ('set', ('key2', 'value2'), {}),
]

success, results, errors = safe_transaction(operations)
if not success:
    print(f"Transaction had {len(errors)} errors:")
    for error in errors:
        print(f"  {error['operation']}: {error['error']}")
```

### Retry Logic

```python
import time
import random

def transaction_with_retry(func, max_retries=5, base_delay=0.1):
    """
    Execute transaction function with exponential backoff retry.
    """
    for attempt in range(max_retries):
        try:
            return func()
        except redis.WatchError:
            if attempt == max_retries - 1:
                raise

            # Exponential backoff with jitter
            delay = base_delay * (2 ** attempt)
            jitter = random.uniform(0, delay * 0.1)
            time.sleep(delay + jitter)

    raise Exception("Max retries exceeded")

# Usage
def update_balance():
    r.watch("balance")
    balance = int(r.get("balance") or 0)

    pipe = r.pipeline(True)
    pipe.set("balance", balance + 100)
    return pipe.execute()

result = transaction_with_retry(update_balance)
```

---

## Transactions vs Lua Scripts

### When to Use Transactions

```python
# Good for transactions:
# - Simple atomic operations
# - When you don't need conditional logic based on values
# - When client-side WATCH/retry is acceptable

# Transfer funds (no conditional logic)
pipe = r.pipeline()
pipe.decrby("balance:A", 100)
pipe.incrby("balance:B", 100)
pipe.execute()
```

### When to Use Lua Scripts

```python
# Better with Lua:
# - Complex conditional logic
# - Need to read and write based on values
# - High contention (avoid multiple round-trips)

# Conditional transfer (needs Lua)
transfer_script = r.register_script("""
local from = KEYS[1]
local to = KEYS[2]
local amount = tonumber(ARGV[1])

local balance = tonumber(redis.call('GET', from) or 0)

if balance < amount then
    return {err = 'Insufficient funds'}
end

redis.call('DECRBY', from, amount)
redis.call('INCRBY', to, amount)

return {ok = 'Transfer complete'}
""")

# Single round-trip, atomic, with conditional logic
result = transfer_script(keys=['balance:A', 'balance:B'], args=[100])
```

### Comparison Table

| Feature | MULTI/EXEC | Lua Scripts |
|---------|------------|-------------|
| Atomicity | Yes | Yes |
| Conditional logic | No (need WATCH) | Yes |
| Round-trips | 1 (but WATCH needs more) | 1 |
| Debugging | Easier | Harder |
| Performance under contention | Lower (retries) | Higher |
| Complexity | Simple | More complex |

---

## Pipeline vs Transaction

### Understanding the Difference

```python
# Pipeline (transaction=False): Commands may interleave
# - Maximum throughput
# - No atomicity guarantee
pipe = r.pipeline(transaction=False)
pipe.set("key1", "value1")
pipe.set("key2", "value2")
pipe.execute()

# Transaction (transaction=True, default): MULTI/EXEC wrapped
# - Atomic execution
# - Slightly lower throughput
pipe = r.pipeline(transaction=True)
pipe.set("key1", "value1")
pipe.set("key2", "value2")
pipe.execute()

# In redis-py, pipeline() defaults to transaction=True
# Use pipeline(transaction=False) for non-atomic batching
```

### Choosing the Right Approach

```python
# Use non-transactional pipeline for:
# - Bulk reads (no conflicts)
# - Independent writes
# - Maximum throughput

# Bulk loading - no atomicity needed
pipe = r.pipeline(transaction=False)
for i in range(10000):
    pipe.set(f"key:{i}", f"value:{i}")
pipe.execute()

# Use transaction for:
# - Related operations that must succeed together
# - Maintaining data consistency

# Balance transfer - must be atomic
pipe = r.pipeline(transaction=True)
pipe.decrby("account:A", 100)
pipe.incrby("account:B", 100)
pipe.execute()
```

---

## Best Practices

### 1. Keep Transactions Short

```python
# Bad: Long transaction blocks other clients
pipe = r.pipeline()
for i in range(10000):
    pipe.set(f"key:{i}", f"value:{i}")
pipe.execute()  # Blocks Redis during EXEC

# Good: Chunk into smaller transactions
def chunked_transaction(items, chunk_size=100):
    for i in range(0, len(items), chunk_size):
        chunk = items[i:i + chunk_size]
        pipe = r.pipeline()
        for key, value in chunk:
            pipe.set(key, value)
        pipe.execute()
```

### 2. Handle WATCH Failures Gracefully

```python
def robust_update(key, update_func, max_retries=10):
    """
    Robust pattern for WATCH-based updates.
    """
    for attempt in range(max_retries):
        try:
            r.watch(key)

            current = r.get(key)
            new_value = update_func(current)

            if new_value is None:
                r.unwatch()
                return None  # No update needed

            pipe = r.pipeline(True)
            pipe.set(key, new_value)
            result = pipe.execute()

            return result[0]

        except redis.WatchError:
            # Log retry for monitoring
            if attempt > 3:
                print(f"High contention on {key}, attempt {attempt}")
            continue

    raise Exception(f"Failed to update {key} after {max_retries} attempts")
```

### 3. Consider Alternatives for High Contention

```python
# High contention scenario: many clients updating same key

# Option 1: Lua script (no retries needed)
increment_if_below = r.register_script("""
local current = tonumber(redis.call('GET', KEYS[1]) or 0)
local max = tonumber(ARGV[1])

if current < max then
    return redis.call('INCR', KEYS[1])
else
    return nil
end
""")

# Option 2: Use Redis atomic commands when possible
# INCR, HINCRBY, etc. are already atomic
r.incr("counter")  # No transaction needed

# Option 3: Distributed locking for complex operations
# See Redis distributed locking patterns
```

---

## Monitoring Transactions

### Track Transaction Metrics

```python
import time
from prometheus_client import Counter, Histogram

tx_attempts = Counter('redis_transaction_attempts_total', 'Transaction attempts')
tx_failures = Counter('redis_transaction_watch_failures_total', 'WATCH failures')
tx_duration = Histogram('redis_transaction_duration_seconds', 'Transaction duration')

def monitored_transaction(func):
    """Decorator to monitor transaction metrics"""
    def wrapper(*args, **kwargs):
        tx_attempts.inc()
        start = time.time()

        try:
            result = func(*args, **kwargs)
            return result
        except redis.WatchError:
            tx_failures.inc()
            raise
        finally:
            tx_duration.observe(time.time() - start)

    return wrapper

@monitored_transaction
def update_balance(user_id, amount):
    # Transaction logic here
    pass
```

---

## Conclusion

Redis transactions with MULTI/EXEC provide:

- **Atomicity**: Commands execute without interruption
- **Isolation**: Other clients don't see intermediate states
- **Optimistic locking**: WATCH enables safe read-modify-write

Key takeaways:
- Use MULTI/EXEC for simple atomic operations
- Use WATCH for read-modify-write patterns
- Consider Lua scripts for complex conditional logic
- Keep transactions short to avoid blocking
- Handle WATCH failures with retry logic

---

*Need to monitor your Redis transactions? [OneUptime](https://oneuptime.com) provides comprehensive Redis monitoring with transaction tracking, latency analysis, and performance alerts.*
