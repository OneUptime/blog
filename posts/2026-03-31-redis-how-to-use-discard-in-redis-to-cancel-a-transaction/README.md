# How to Use DISCARD in Redis to Cancel a Transaction

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Transaction, Data Integrity, Command

Description: Learn how to use the DISCARD command in Redis to cancel a queued transaction and exit MULTI mode without executing any queued commands.

---

## What Is DISCARD in Redis

Redis supports transactions through the `MULTI`/`EXEC` block. When you issue `MULTI`, Redis enters transaction mode and queues every subsequent command. `EXEC` runs all queued commands atomically. `DISCARD` is the escape hatch - it cancels the transaction, clears the command queue, and returns the connection to normal mode.

```text
DISCARD
```

Returns `OK` if the transaction was successfully aborted.

## Basic Usage

```bash
# Start a transaction
MULTI

# Queue some commands
SET user:1:balance 100
DECRBY user:1:balance 50

# Decide to cancel instead of executing
DISCARD
```

Redis responds with `OK` and no commands are executed.

## When to Use DISCARD

DISCARD is useful in several scenarios:

- You detect invalid input after starting `MULTI`
- A pre-condition check fails mid-transaction
- Your application encounters an error and wants to roll back queued operations
- You use `WATCH` and want to abort after detecting a conflict

## DISCARD with WATCH

`WATCH` marks keys for optimistic locking. If a watched key changes before `EXEC`, the transaction aborts automatically. You can also call `DISCARD` explicitly to abort and release all watches:

```bash
WATCH user:1:balance

# Check the balance
GET user:1:balance
# Returns: 100

MULTI
DECRBY user:1:balance 200

# Decide the deduction is invalid - cancel
DISCARD

# WATCH is also released at this point
```

After `DISCARD`, all `WATCH` effects are cleared, equivalent to calling `UNWATCH`.

## Practical Example in Python

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def safe_transfer(from_key, to_key, amount):
    with client.pipeline() as pipe:
        while True:
            try:
                pipe.watch(from_key)
                balance = int(pipe.get(from_key) or 0)

                if balance < amount:
                    # Abort the transaction - insufficient funds
                    pipe.reset()  # This calls UNWATCH internally to release the watch
                    print("Insufficient funds - transaction cancelled")
                    return False

                pipe.multi()
                pipe.decrby(from_key, amount)
                pipe.incrby(to_key, amount)
                pipe.execute()
                return True

            except redis.WatchError:
                # Another client modified the key - retry
                continue

safe_transfer('user:1:balance', 'user:2:balance', 50)
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

async function cancelTransaction() {
  const client = createClient();
  await client.connect();

  // Enter transaction mode manually to demonstrate DISCARD
  await client.sendCommand(['MULTI']);
  await client.sendCommand(['SET', 'key1', 'value1']);
  await client.sendCommand(['SET', 'key2', 'value2']);

  // Decide to cancel before EXEC
  await client.sendCommand(['DISCARD']);
  console.log('Transaction cancelled');

  await client.disconnect();
}

cancelTransaction();
```

## Error Handling After DISCARD

After `DISCARD`, the connection is back in normal mode. You can issue regular commands immediately:

```bash
MULTI
SET temp:key "value"
# Something goes wrong...
DISCARD

# Normal commands work again
GET some:other:key
SET another:key "safe value"
```

## DISCARD vs Errors Inside EXEC

It is important to understand the difference between `DISCARD` and errors during `EXEC`:

- `DISCARD` - proactively cancels the whole transaction before execution
- Syntax errors queued before `EXEC` - Redis aborts the entire `EXEC`
- Runtime errors during `EXEC` - only the failing command fails; others still execute

```bash
MULTI
SET valid:key "hello"
INCR not:a:number   # Will fail at EXEC time - but won't abort others
SET another:key "world"
EXEC
# Result: OK, ERR, OK  - partial execution, no rollback
```

If you want true all-or-nothing behavior, detect errors early and use `DISCARD` before calling `EXEC`.

## Common Pitfalls

- Calling `DISCARD` outside a `MULTI` block returns an error: `ERR DISCARD without MULTI`
- `DISCARD` does not roll back commands already executed before `MULTI`
- After `DISCARD`, `WATCH` state is cleared; you must call `WATCH` again if needed

```bash
DISCARD
# ERR DISCARD without MULTI
```

## Summary

`DISCARD` cancels an active Redis transaction started with `MULTI`, discarding all queued commands and releasing any `WATCH` locks. Use it when you detect invalid conditions after entering transaction mode or when an application error requires aborting the operation. Unlike runtime errors in `EXEC`, `DISCARD` guarantees no queued command will run.
