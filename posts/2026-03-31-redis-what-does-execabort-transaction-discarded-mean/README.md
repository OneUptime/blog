# What Does 'EXECABORT Transaction discarded' Mean in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Transaction, Error, Debugging

Description: Understand the Redis EXECABORT error that occurs when a MULTI/EXEC transaction is discarded due to command errors, with examples and fixes.

---

The `EXECABORT Transaction discarded because of previous errors.` error occurs when you call `EXEC` to run a Redis transaction, but one or more commands queued after `MULTI` had syntax or arity errors. Redis discards the entire transaction automatically.

## What Causes the Error

When you issue commands between `MULTI` and `EXEC`, Redis queues them but does not execute them yet. If any command has a syntax error or uses the wrong number of arguments, Redis marks the transaction as failed. Calling `EXEC` on a failed transaction returns EXECABORT.

```bash
127.0.0.1:6379> MULTI
OK
127.0.0.1:6379> SET key1 "hello"
QUEUED
127.0.0.1:6379> INVALIDCMD
(error) ERR unknown command 'INVALIDCMD', with args beginning with:
127.0.0.1:6379> SET key2 "world"
QUEUED
127.0.0.1:6379> EXEC
(error) EXECABORT Transaction discarded because of previous errors.
```

Note: This is different from runtime errors. If a command is syntactically valid but fails at runtime (such as a WRONGTYPE error), the other commands still execute.

## Difference Between Compile-Time and Runtime Errors

```bash
# Compile-time error - entire transaction is aborted
127.0.0.1:6379> MULTI
OK
127.0.0.1:6379> SET key1 value1
QUEUED
127.0.0.1:6379> HSET  # missing arguments
(error) ERR wrong number of arguments for 'hset' command
127.0.0.1:6379> EXEC
(error) EXECABORT Transaction discarded because of previous errors.
```

```bash
# Runtime error - other commands still execute
127.0.0.1:6379> SET mystr "hello"
OK
127.0.0.1:6379> MULTI
OK
127.0.0.1:6379> SET key1 "value1"
QUEUED
127.0.0.1:6379> LPUSH mystr "item"  # Wrong type, but valid syntax
QUEUED
127.0.0.1:6379> SET key2 "value2"
QUEUED
127.0.0.1:6379> EXEC
1) OK
2) (error) WRONGTYPE Operation against a key holding the wrong kind of value
3) OK
```

## How to Fix It

Ensure all commands queued in a transaction have correct syntax and the right number of arguments. If you notice errors while queuing commands, use `DISCARD` instead of `EXEC` to cleanly abandon the transaction block and start again.

```bash
127.0.0.1:6379> MULTI
OK
127.0.0.1:6379> SET key1 "hello"
QUEUED
127.0.0.1:6379> DISCARD
OK
```

## Handling in Application Code

```python
import redis

r = redis.Redis(decode_responses=True)

def transfer_credits(from_user, to_user, amount):
    with r.pipeline() as pipe:
        try:
            pipe.multi()
            pipe.decrby(f"credits:{from_user}", amount)
            pipe.incrby(f"credits:{to_user}", amount)
            pipe.execute()
        except redis.exceptions.ResponseError as e:
            print(f"Transaction failed: {e}")
            pipe.reset()
```

## Using WATCH for Optimistic Locking

```python
def safe_transfer(from_user, to_user, amount):
    with r.pipeline() as pipe:
        while True:
            try:
                pipe.watch(f"credits:{from_user}")
                balance = int(pipe.get(f"credits:{from_user}") or 0)
                if balance < amount:
                    raise ValueError("Insufficient credits")
                pipe.multi()
                pipe.decrby(f"credits:{from_user}", amount)
                pipe.incrby(f"credits:{to_user}", amount)
                pipe.execute()
                break
            except redis.WatchError:
                continue  # Another client modified the key, retry
```

## Summary

EXECABORT means Redis discarded your transaction because a command queued after `MULTI` had a syntax or arity error before `EXEC` was called. Always validate command arguments in your application before entering a transaction, and use `DISCARD` to cleanly abandon a failed transaction block.
