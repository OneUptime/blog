# How to Use WAIT for Synchronous Replication in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Replication, WAIT, Durability, Consistency

Description: Learn how to use the Redis WAIT command to block until a specified number of replicas have acknowledged a write, enabling stronger durability guarantees.

---

## What Is the WAIT Command?

Redis replication is asynchronous by default. When a client writes to the primary, the write is acknowledged immediately without waiting for replicas to confirm they received it. This means data can be lost if the primary crashes before replicas catch up.

The `WAIT` command lets you block the current client connection until a specified number of replicas have applied all previous write commands, effectively turning asynchronous replication into semi-synchronous replication on demand.

## WAIT Syntax

```text
WAIT numreplicas timeout
```

- `numreplicas` - The number of replicas that must acknowledge the writes
- `timeout` - Milliseconds to wait. `0` means wait indefinitely.

The command returns the number of replicas that acknowledged the write within the timeout.

## Basic Usage

```bash
# Write a value
redis-cli SET critical_key "critical_value"

# Wait for 1 replica to confirm, up to 1000ms
redis-cli WAIT 1 1000
```

If 1 replica acknowledges within 1 second, `WAIT` returns `1`. If no replica acknowledges in time, it returns `0`.

## Checking If the Write Was Durably Replicated

```bash
redis-cli SET payment_record "txn-12345"
result=$(redis-cli WAIT 2 500)
if [ "$result" -ge 2 ]; then
  echo "Write replicated to 2 replicas"
else
  echo "WARNING: Only $result replicas confirmed"
fi
```

## Using WAIT in Application Code

```python
import redis

r = redis.Redis(host="primary", port=6379, password="pass")

def write_with_replication_guarantee(key, value, min_replicas=1, timeout_ms=1000):
    """Write a key and wait for it to be replicated."""
    r.set(key, value)
    confirmed = r.wait(min_replicas, timeout_ms)
    if confirmed < min_replicas:
        raise Exception(
            f"Replication not confirmed: only {confirmed}/{min_replicas} replicas acknowledged"
        )
    return confirmed

# Usage
try:
    confirmed = write_with_replication_guarantee("order:5001", "placed", min_replicas=1)
    print(f"Write confirmed by {confirmed} replica(s)")
except Exception as e:
    print(f"Replication warning: {e}")
```

## WAIT in Transactions (MULTI/EXEC)

`WAIT` can be used after a transaction to confirm all transaction writes were replicated:

```bash
redis-cli << 'EOF'
MULTI
SET balance:user1 500
SET balance:user2 300
EXEC
WAIT 1 1000
EOF
```

Note: All commands must run on the same connection. Each separate `redis-cli` invocation opens a new connection, so piping commands via stdin or using interactive mode ensures MULTI/EXEC and WAIT share one session.

## How WAIT Works Internally

When you call `WAIT`:

1. Redis records the current replication offset on the primary
2. The primary sends a ping to all replicas asking them to report their current offset
3. Replicas respond with their current offset
4. When enough replicas report an offset >= the recorded offset, `WAIT` returns
5. If the timeout expires first, `WAIT` returns the count of replicas that have caught up

## Performance Impact

`WAIT` blocks the calling client for up to the specified timeout. This adds latency to each write that uses it. Use it selectively:

- For critical writes (financial transactions, configuration changes)
- Not for high-throughput bulk writes or cache updates

Typical overhead with 1 replica and good network: 1-5ms per call.

## WAIT vs AOF always

`WAIT` and `appendfsync always` serve different durability goals:

```text
Mechanism          | Protects Against
-------------------|-------------------------------------------------
WAIT numreplicas=1 | Primary crash (data survives on replica)
appendfsync always | Primary process crash (data fsynced to disk)
Both combined      | Primary crash and disk failure (redundant copies)
```

For the highest durability, combine AOF on replicas with WAIT in your application.

## Handling WAIT Timeouts

When `WAIT` returns fewer replicas than requested, decide on your application's behavior:

```python
def critical_write(key, value):
    pipeline = r.pipeline()
    pipeline.set(key, value)
    pipeline.execute()

    # Wait for replication
    confirmed = r.wait(1, 2000)

    if confirmed == 0:
        # No replica confirmed - consider the write at risk
        # Options: retry, alert, mark the record as unconfirmed
        log_replication_failure(key)
    elif confirmed < 2:
        # Partial replication - warning level
        log_replication_warning(key, confirmed)
```

## Checking Current Replica Count

Before using `WAIT`, verify replicas are connected:

```bash
redis-cli INFO replication | grep connected_slaves
```

Calling `WAIT 1 1000` with zero connected replicas will always time out.

## Summary

The `WAIT` command adds semi-synchronous replication semantics to Redis by blocking until a specified number of replicas have applied your writes. Use it for critical writes where data loss is unacceptable - financial records, configuration updates, or any write that must survive a primary crash. Balance durability with performance by using `WAIT` selectively and setting an appropriate timeout that fits your latency budget.
