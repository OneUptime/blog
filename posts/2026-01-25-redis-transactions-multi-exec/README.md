# How to Execute Transactions with MULTI/EXEC in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Transactions, MULTI, EXEC, WATCH, Atomicity, Concurrency

Description: Learn how to use Redis transactions with MULTI/EXEC to execute multiple commands atomically. This guide covers basic transactions, optimistic locking with WATCH, and common patterns for concurrent data operations.

---

> Redis transactions let you execute multiple commands as a single atomic operation. Unlike database transactions with rollback capabilities, Redis transactions guarantee that either all commands execute or none do, and that no other client can interrupt the sequence.

Understanding Redis transactions is essential for building reliable applications that need to modify multiple keys consistently. This guide covers MULTI/EXEC basics, optimistic locking with WATCH, and practical patterns for concurrent operations.

---

## Basic Transaction Structure

A Redis transaction consists of three stages:

1. MULTI - Start the transaction
2. Queue commands - Commands are queued, not executed
3. EXEC - Execute all queued commands atomically

```bash
# Start a transaction
MULTI

# Queue commands (these return "QUEUED", not results)
SET user:123:balance 100
INCR user:123:transactions
LPUSH user:123:history "deposit:100"

# Execute all commands atomically
EXEC
# Returns array of results for each command
```

If you want to cancel a transaction:

```bash
MULTI
SET key1 "value1"
SET key2 "value2"
DISCARD  # Cancels the transaction, nothing is executed
```

---

## Python Implementation

Here is how to use transactions in Python with redis-py:

```python
import redis
from typing import List, Any, Optional
from dataclasses import dataclass

@dataclass
class TransferResult:
    success: bool
    message: str
    from_balance: Optional[float] = None
    to_balance: Optional[float] = None


class BankAccount:
    """
    Bank account operations using Redis transactions.
    Demonstrates atomic multi-key updates.
    """

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def _balance_key(self, account_id: str) -> str:
        return f"account:{account_id}:balance"

    def _history_key(self, account_id: str) -> str:
        return f"account:{account_id}:history"

    def create_account(self, account_id: str, initial_balance: float) -> bool:
        """
        Create a new account with initial balance.
        Uses a transaction to set balance and create history atomically.
        """
        balance_key = self._balance_key(account_id)
        history_key = self._history_key(account_id)

        # Use pipeline with transaction=True (default)
        # This wraps commands in MULTI/EXEC
        pipe = self.redis.pipeline()

        pipe.set(balance_key, initial_balance)
        pipe.lpush(history_key, f"created:initial_balance:{initial_balance}")
        pipe.expire(history_key, 86400 * 365)  # Keep history for 1 year

        results = pipe.execute()

        # All commands succeeded if we get here
        return True

    def transfer(
        self,
        from_account: str,
        to_account: str,
        amount: float
    ) -> TransferResult:
        """
        Transfer money between accounts atomically.
        Uses WATCH for optimistic locking.
        """
        from_key = self._balance_key(from_account)
        to_key = self._balance_key(to_account)

        # Maximum retry attempts for optimistic locking
        max_retries = 5

        for attempt in range(max_retries):
            try:
                # WATCH the keys we're going to modify
                # If another client modifies them, EXEC will fail
                self.redis.watch(from_key, to_key)

                # Get current balances
                from_balance = float(self.redis.get(from_key) or 0)
                to_balance = float(self.redis.get(to_key) or 0)

                # Validate transfer
                if from_balance < amount:
                    self.redis.unwatch()
                    return TransferResult(
                        success=False,
                        message="Insufficient funds"
                    )

                # Calculate new balances
                new_from_balance = from_balance - amount
                new_to_balance = to_balance + amount

                # Start transaction
                pipe = self.redis.pipeline()

                # Queue the commands
                pipe.set(from_key, new_from_balance)
                pipe.set(to_key, new_to_balance)
                pipe.lpush(
                    self._history_key(from_account),
                    f"transfer_out:{to_account}:{amount}"
                )
                pipe.lpush(
                    self._history_key(to_account),
                    f"transfer_in:{from_account}:{amount}"
                )

                # Execute transaction
                # This will raise WatchError if watched keys changed
                pipe.execute()

                return TransferResult(
                    success=True,
                    message="Transfer completed",
                    from_balance=new_from_balance,
                    to_balance=new_to_balance
                )

            except redis.WatchError:
                # Another client modified the watched keys
                # Retry the transaction
                continue

        return TransferResult(
            success=False,
            message=f"Transfer failed after {max_retries} attempts due to contention"
        )

    def get_balance(self, account_id: str) -> Optional[float]:
        """Get account balance."""
        balance = self.redis.get(self._balance_key(account_id))
        return float(balance) if balance else None


# Usage example
if __name__ == '__main__':
    r = redis.Redis(host='localhost', port=6379, decode_responses=True)
    bank = BankAccount(r)

    # Create accounts
    bank.create_account('alice', 1000.00)
    bank.create_account('bob', 500.00)

    # Transfer funds
    result = bank.transfer('alice', 'bob', 250.00)
    print(f"Transfer result: {result}")

    # Check balances
    print(f"Alice balance: {bank.get_balance('alice')}")
    print(f"Bob balance: {bank.get_balance('bob')}")
```

---

## Optimistic Locking with WATCH

WATCH enables optimistic locking by monitoring keys for changes:

```python
def increment_with_check(redis_client: redis.Redis, key: str, max_value: int) -> bool:
    """
    Increment a counter but only if it's below max_value.
    Uses WATCH for optimistic locking.
    """
    max_retries = 10

    for _ in range(max_retries):
        try:
            # Watch the key for changes
            redis_client.watch(key)

            # Read current value
            current = int(redis_client.get(key) or 0)

            if current >= max_value:
                redis_client.unwatch()
                return False

            # Start transaction
            pipe = redis_client.pipeline()
            pipe.incr(key)
            pipe.execute()

            return True

        except redis.WatchError:
            # Key was modified by another client, retry
            continue

    return False


def reserve_inventory(
    redis_client: redis.Redis,
    product_id: str,
    quantity: int
) -> dict:
    """
    Reserve inventory atomically.
    Prevents overselling with optimistic locking.
    """
    stock_key = f"product:{product_id}:stock"
    reserved_key = f"product:{product_id}:reserved"

    max_retries = 5

    for attempt in range(max_retries):
        try:
            redis_client.watch(stock_key, reserved_key)

            # Get current inventory state
            available = int(redis_client.get(stock_key) or 0)
            reserved = int(redis_client.get(reserved_key) or 0)
            actual_available = available - reserved

            if actual_available < quantity:
                redis_client.unwatch()
                return {
                    'success': False,
                    'error': 'Insufficient inventory',
                    'available': actual_available
                }

            # Reserve the inventory
            pipe = redis_client.pipeline()
            pipe.incrby(reserved_key, quantity)
            pipe.execute()

            return {
                'success': True,
                'reserved': quantity,
                'remaining': actual_available - quantity
            }

        except redis.WatchError:
            continue

    return {'success': False, 'error': 'Too much contention, try again'}
```

---

## Node.js Implementation

Here is the equivalent in Node.js:

```javascript
// redis-transactions.js
const Redis = require('ioredis');

class BankAccount {
    constructor(redisClient) {
        this.redis = redisClient;
    }

    balanceKey(accountId) {
        return `account:${accountId}:balance`;
    }

    historyKey(accountId) {
        return `account:${accountId}:history`;
    }

    async createAccount(accountId, initialBalance) {
        const pipeline = this.redis.pipeline();

        pipeline.set(this.balanceKey(accountId), initialBalance);
        pipeline.lpush(this.historyKey(accountId),
            `created:initial_balance:${initialBalance}`);

        await pipeline.exec();
        return true;
    }

    async transfer(fromAccount, toAccount, amount) {
        const fromKey = this.balanceKey(fromAccount);
        const toKey = this.balanceKey(toAccount);

        const maxRetries = 5;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                // Watch keys for optimistic locking
                await this.redis.watch(fromKey, toKey);

                // Get current balances
                const [fromBalance, toBalance] = await Promise.all([
                    this.redis.get(fromKey),
                    this.redis.get(toKey)
                ]);

                const fromBalanceNum = parseFloat(fromBalance) || 0;
                const toBalanceNum = parseFloat(toBalance) || 0;

                // Validate
                if (fromBalanceNum < amount) {
                    await this.redis.unwatch();
                    return {
                        success: false,
                        message: 'Insufficient funds'
                    };
                }

                // Calculate new balances
                const newFromBalance = fromBalanceNum - amount;
                const newToBalance = toBalanceNum + amount;

                // Execute transaction
                const results = await this.redis
                    .multi()
                    .set(fromKey, newFromBalance)
                    .set(toKey, newToBalance)
                    .lpush(this.historyKey(fromAccount),
                        `transfer_out:${toAccount}:${amount}`)
                    .lpush(this.historyKey(toAccount),
                        `transfer_in:${fromAccount}:${amount}`)
                    .exec();

                // Check if transaction succeeded
                if (results === null) {
                    // WATCH detected a change, retry
                    continue;
                }

                return {
                    success: true,
                    message: 'Transfer completed',
                    fromBalance: newFromBalance,
                    toBalance: newToBalance
                };

            } catch (error) {
                if (error.message.includes('WATCH')) {
                    continue;
                }
                throw error;
            }
        }

        return {
            success: false,
            message: `Transfer failed after ${maxRetries} attempts`
        };
    }
}

// Inventory reservation example
async function reserveInventory(redis, productId, quantity) {
    const stockKey = `product:${productId}:stock`;
    const reservedKey = `product:${productId}:reserved`;

    const maxRetries = 5;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        await redis.watch(stockKey, reservedKey);

        const [stock, reserved] = await Promise.all([
            redis.get(stockKey),
            redis.get(reservedKey)
        ]);

        const available = (parseInt(stock) || 0) - (parseInt(reserved) || 0);

        if (available < quantity) {
            await redis.unwatch();
            return { success: false, error: 'Insufficient inventory' };
        }

        const result = await redis
            .multi()
            .incrby(reservedKey, quantity)
            .exec();

        if (result !== null) {
            return { success: true, reserved: quantity };
        }
    }

    return { success: false, error: 'Too much contention' };
}

module.exports = { BankAccount, reserveInventory };
```

---

## Common Transaction Patterns

### Counter with Maximum

```python
def safe_increment(redis_client: redis.Redis, key: str, max_val: int) -> int:
    """
    Increment a counter but cap at maximum value.
    Returns the new value.
    """
    while True:
        try:
            redis_client.watch(key)
            current = int(redis_client.get(key) or 0)

            if current >= max_val:
                redis_client.unwatch()
                return current

            pipe = redis_client.pipeline()
            pipe.incr(key)
            pipe.execute()

            return current + 1

        except redis.WatchError:
            continue
```

### Atomic List Operations

```python
def move_between_lists(
    redis_client: redis.Redis,
    source_list: str,
    dest_list: str,
    value: str
) -> bool:
    """
    Move an item from one list to another atomically.
    """
    while True:
        try:
            redis_client.watch(source_list)

            # Check if value exists in source
            items = redis_client.lrange(source_list, 0, -1)
            if value not in items:
                redis_client.unwatch()
                return False

            # Move atomically
            pipe = redis_client.pipeline()
            pipe.lrem(source_list, 1, value)
            pipe.rpush(dest_list, value)
            pipe.execute()

            return True

        except redis.WatchError:
            continue
```

### Conditional Set

```python
def set_if_higher(
    redis_client: redis.Redis,
    key: str,
    new_value: float
) -> bool:
    """
    Set a value only if it's higher than current value.
    Useful for high scores, max values, etc.
    """
    while True:
        try:
            redis_client.watch(key)
            current = float(redis_client.get(key) or 0)

            if new_value <= current:
                redis_client.unwatch()
                return False

            pipe = redis_client.pipeline()
            pipe.set(key, new_value)
            pipe.execute()

            return True

        except redis.WatchError:
            continue
```

---

## Transaction Limitations

Redis transactions have important limitations to understand:

1. **No rollback**: If a command fails during EXEC, other commands still execute
2. **No nested transactions**: You cannot nest MULTI/EXEC blocks
3. **WATCH is per-connection**: Different connections have independent WATCH state
4. **Queue memory**: Queued commands consume memory until EXEC

```python
def demonstrate_no_rollback():
    """
    Show that Redis transactions don't rollback on command errors.
    """
    r = redis.Redis(host='localhost', port=6379, decode_responses=True)

    # Set up initial state
    r.set('string_key', 'hello')
    r.set('counter', '10')

    # This transaction has a command that will fail
    pipe = r.pipeline()
    pipe.incr('counter')  # Will succeed
    pipe.incr('string_key')  # Will fail (can't INCR a string)
    pipe.incr('counter')  # Will succeed

    try:
        results = pipe.execute()
        # results[0] = 11 (success)
        # results[1] = ResponseError (failure)
        # results[2] = 12 (success - NOT rolled back)
    except redis.ResponseError as e:
        # Handle the error
        pass
```

---

## Best Practices

1. **Keep transactions short**: Minimize time between WATCH and EXEC to reduce contention

2. **Implement retry logic**: Always handle WatchError with retries for concurrent scenarios

3. **Use pipelines for non-transactional batching**: When atomicity is not required, pipelines without MULTI are faster

4. **Consider Lua scripts for complex logic**: When you need conditional logic within a transaction, Lua scripts are often better

5. **Watch only necessary keys**: Watching too many keys increases WatchError probability

Redis transactions with MULTI/EXEC provide a reliable way to execute multiple commands atomically. Combined with WATCH for optimistic locking, they enable safe concurrent operations without the overhead of traditional locking mechanisms.
