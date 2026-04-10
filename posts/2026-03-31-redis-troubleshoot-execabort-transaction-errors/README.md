# How to Troubleshoot Redis EXECABORT Transaction Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Transaction, EXECABORT, MULTI, Troubleshooting

Description: Fix Redis EXECABORT errors in MULTI/EXEC transactions - understand what causes them, how to handle command errors, and write reliable transaction code.

---

`EXECABORT Transaction discarded because of previous errors` means your `EXEC` call was rejected because one or more commands queued between `MULTI` and `EXEC` had a syntax or command error. Redis aborts the whole transaction rather than executing partially.

## Understanding EXECABORT vs WRONGTYPE

Redis transactions have two distinct error behaviors:

1. **EXECABORT** - occurs at `EXEC` time when a queued command had a compilation/syntax error
2. **WRONGTYPE** or runtime errors - occur during execution but do NOT abort the transaction; other commands still run

```bash
# This causes EXECABORT (syntax error queued during MULTI)
redis-cli MULTI
redis-cli NOTACOMMAND arg1  # returns -ERR unknown command during MULTI
redis-cli SET key value
redis-cli EXEC
# (error) EXECABORT Transaction discarded because of previous errors.
```

```bash
# This does NOT cause EXECABORT (runtime error, transaction continues)
redis-cli SET mykey "hello"
redis-cli MULTI
redis-cli INCR mykey       # will fail at EXEC (wrong type) but queued OK
redis-cli SET other value  # this WILL execute
redis-cli EXEC
# 1) (error) WRONGTYPE Operation against a key holding the wrong kind of value
# 2) OK
```

## Common Causes of EXECABORT

```bash
# 1. Typo in command name
redis-cli MULTI
redis-cli SSET key value  # typo - should be SET
redis-cli EXEC
# EXECABORT

# 2. Wrong number of arguments
redis-cli MULTI
redis-cli SET  # missing key and value arguments
redis-cli EXEC
# EXECABORT

# 3. Using a disabled/renamed command
# If redis.conf has: rename-command SET ""
redis-cli MULTI
redis-cli SET key value  # command is disabled
redis-cli EXEC
# EXECABORT
```

## Detecting Command Queuing Errors

When queuing commands inside MULTI, watch the response:

```bash
redis-cli MULTI
# OK

redis-cli SET key1 value1
# QUEUED  <-- this is good

redis-cli NOTACOMMAND
# (error) ERR unknown command 'NOTACOMMAND'  <-- this will cause EXECABORT

redis-cli EXEC
# (error) EXECABORT Transaction discarded because of previous errors.
```

## Fix in Application Code

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def safe_transaction(operations):
    """
    Execute a Redis MULTI/EXEC transaction safely.
    operations: list of (command, *args) tuples
    """
    try:
        pipe = r.pipeline(transaction=True)

        for cmd, *args in operations:
            # Queue commands via pipeline
            getattr(pipe, cmd)(*args)

        results = pipe.execute()
        return results

    except redis.exceptions.ResponseError as e:
        if "EXECABORT" in str(e):
            print(f"Transaction aborted due to command error: {e}")
            return None
        raise

# Usage - valid transaction
results = safe_transaction([
    ("set", "user:1:name", "Alice"),
    ("set", "user:1:email", "alice@example.com"),
    ("incr", "stats:registrations")
])
print(results)  # [True, True, 1]
```

## Using DISCARD to Cancel a Bad Transaction

```python
def atomic_transfer(src_key, dst_key, amount):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            pipe = r.pipeline(transaction=True)
            pipe.watch(src_key, dst_key)

            src_balance = int(pipe.get(src_key) or 0)
            if src_balance < amount:
                pipe.reset()  # calls UNWATCH + DISCARD if in MULTI
                raise ValueError(f"Insufficient balance: {src_balance}")

            pipe.multi()
            pipe.decrby(src_key, amount)
            pipe.incrby(dst_key, amount)
            pipe.execute()
            return True

        except redis.exceptions.WatchError:
            print(f"Concurrent modification, retrying (attempt {attempt + 1})")
            continue

    raise RuntimeError("Transaction failed after retries")
```

## Checking for Queuing Errors Explicitly

```python
def check_transaction_safe(commands):
    """
    Verify all commands queue successfully before calling EXEC.
    """
    pipe = r.pipeline(transaction=True)
    pipe.multi()

    errors = []
    for i, (cmd, *args) in enumerate(commands):
        try:
            getattr(pipe, cmd)(*args)
        except Exception as e:
            errors.append((i, cmd, str(e)))

    if errors:
        pipe.reset()
        for i, cmd, err in errors:
            print(f"Command {i} ({cmd}) would fail: {err}")
        return None

    return pipe.execute()
```

## Monitoring for EXECABORT in Production

```bash
# Check error stats for EXECABORT occurrences (Redis 6.2+)
redis-cli INFO errorstats | grep EXECABORT

# Use MONITOR to trace transaction commands
redis-cli MONITOR | grep -E "MULTI|EXEC|DISCARD"

# Check command stats for EXEC failure rates (Redis 7.0+ shows failed_calls)
redis-cli INFO commandstats | grep exec
```

## Summary

EXECABORT occurs when a command inside a `MULTI`/`EXEC` block has a syntax or command-name error. The fix is to validate command names and argument counts before queuing, watch the response to each queued command, and use `DISCARD` to cancel any transaction where queuing fails. Use `redis-py`'s pipeline with `transaction=True` which raises `ResponseError` automatically on EXECABORT.
