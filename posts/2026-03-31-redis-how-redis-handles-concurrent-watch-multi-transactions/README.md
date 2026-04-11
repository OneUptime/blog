# How Redis Handles Concurrent WATCH and MULTI Transactions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Transaction, Concurrency

Description: Understand how Redis WATCH with MULTI/EXEC implements optimistic locking, handles concurrent modifications, and when transactions are aborted.

---

Redis transactions with WATCH implement optimistic locking. Rather than blocking concurrent writers, Redis lets you detect whether a watched key was modified and abort the transaction if it was. This is critical for write-conflict-free atomic operations.

## WATCH and MULTI/EXEC Basics

WATCH marks one or more keys to monitor. If any watched key is modified by another client before EXEC runs, the transaction is aborted and EXEC returns nil:

```bash
WATCH mykey
MULTI
SET mykey newvalue
EXEC
```

## Concurrent Modification Scenario

Here is the sequence when a concurrent write wins:

```text
Client A: WATCH balance
Client B: SET balance 100         # Modifies watched key
Client A: MULTI
Client A: SET balance 200
Client A: EXEC                    # Returns nil - transaction aborted
```

Client A's transaction is aborted because Client B modified `balance` after the WATCH.

## Implementing Optimistic Locking in Python

The typical pattern is to retry the transaction until it succeeds:

```python
import redis

r = redis.Redis()

def transfer_funds(from_key, to_key, amount):
    with r.pipeline() as pipe:
        while True:
            try:
                pipe.watch(from_key, to_key)
                from_balance = int(pipe.get(from_key) or 0)
                to_balance = int(pipe.get(to_key) or 0)

                if from_balance < amount:
                    pipe.unwatch()
                    raise ValueError("Insufficient funds")

                pipe.multi()
                pipe.set(from_key, from_balance - amount)
                pipe.set(to_key, to_balance + amount)
                pipe.execute()
                break
            except redis.WatchError:
                continue  # Retry on conflict
```

## What Triggers an Abort

Any modification to a watched key causes the transaction to abort:
- SET, DEL, INCR, EXPIRE on the watched key
- Key expiration (if the key expires, it is considered modified)
- Another client running FLUSHDB or FLUSHALL

## WATCH Only Monitors Keys, Not Values

WATCH monitors whether a key was written to, not whether its value changed. If another client runs `SET mykey samevalue`, the WATCH is still triggered even if the value is identical.

## Combining WATCH with MULTI

WATCH must be called before MULTI. Calling WATCH inside a MULTI block returns an error (`ERR WATCH inside MULTI is not allowed`):

```bash
WATCH key1 key2
MULTI
GET key1        # This is queued, not executed immediately
EXEC            # Executes all queued commands, or aborts if key1/key2 changed
```

## When to Use WATCH vs Lua Scripts

For complex atomic operations, Lua scripts are often simpler than WATCH loops since Lua scripts run atomically without the risk of retry loops:

```bash
redis-cli EVAL "
  local val = redis.call('GET', KEYS[1])
  redis.call('SET', KEYS[1], tonumber(val) + ARGV[1])
  return redis.call('GET', KEYS[1])
" 1 counter 5
```

## Summary

Redis WATCH implements optimistic locking by monitoring keys between WATCH and EXEC. If any watched key is modified by another client, EXEC returns nil and the transaction is aborted. The caller must detect this and retry. Lua scripts provide a simpler alternative for atomic operations on small sets of keys.
