# How to Combine Pipelining with Transactions in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pipeline, Transaction, MULTI

Description: Combine Redis pipelining and MULTI/EXEC transactions to achieve both atomicity and reduced round trips in a single network operation.

---

Redis pipelining reduces network round trips. MULTI/EXEC transactions provide atomicity. You can combine both by wrapping the MULTI/EXEC block inside a pipeline, sending all commands in one batch while maintaining atomic execution.

## How They Combine

Without combining, a transaction requires a round trip per command:

```text
Round trip 1:  MULTI    -> +OK
Round trip 2:  SET a 1  -> +QUEUED
Round trip 3:  INCR b   -> +QUEUED
Round trip 4:  EXEC     -> [results]
```

With a pipeline wrapping the transaction, all commands go in one payload:

```text
Round trip 1:  MULTI | SET a 1 | INCR b | EXEC -> [results]
```

## Python - redis-py

In redis-py, `r.pipeline()` with `transaction=True` (the default) automatically combines pipelining and MULTI/EXEC:

```python
import redis

r = redis.Redis(decode_responses=True)

# Default pipeline = transaction=True = pipelining + MULTI/EXEC
with r.pipeline() as pipe:
    pipe.set("balance:alice", 100)
    pipe.set("balance:bob", 50)
    pipe.incrby("balance:alice", 25)
    pipe.decrby("balance:bob", 25)
    results = pipe.execute()

print(results)  # [True, True, 125, 25]
```

To explicitly use pipelining without transaction:

```python
with r.pipeline(transaction=False) as pipe:
    pipe.set("a", 1)
    pipe.set("b", 2)
    results = pipe.execute()
```

## Python - WATCH with Transaction + Pipeline

WATCH enables optimistic concurrency control alongside the pipelined transaction:

```python
def transfer(r, from_key, to_key, amount):
    with r.pipeline() as pipe:
        while True:
            try:
                pipe.watch(from_key, to_key)

                from_bal = int(pipe.get(from_key) or 0)
                to_bal = int(pipe.get(to_key) or 0)

                if from_bal < amount:
                    pipe.reset()
                    raise ValueError("Insufficient balance")

                # Switch to buffered mode - commands queue until EXEC
                pipe.multi()
                pipe.decrby(from_key, amount)
                pipe.incrby(to_key, amount)
                results = pipe.execute()  # sends MULTI..EXEC in one batch
                return results
            except redis.WatchError:
                continue  # retry if keys changed
```

## Go - go-redis

```go
ctx := context.Background()
rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

// TxPipelined = pipeline wrapping a transaction
_, err := rdb.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
    pipe.Set(ctx, "balance:alice", 100, 0)
    pipe.Set(ctx, "balance:bob", 50, 0)
    pipe.IncrBy(ctx, "balance:alice", 25)
    pipe.DecrBy(ctx, "balance:bob", 25)
    return nil
})
if err != nil {
    panic(err)
}

// vs. non-transactional pipeline
_, err = rdb.Pipelined(ctx, func(pipe redis.Pipeliner) error {
    pipe.Set(ctx, "a", 1, 0)
    pipe.Set(ctx, "b", 2, 0)
    return nil
})
```

## Node.js - ioredis

```javascript
const results = await client.multi()
  .set("balance:alice", 100)
  .set("balance:bob", 50)
  .incrby("balance:alice", 25)
  .decrby("balance:bob", 25)
  .exec();
// All commands sent as one pipelined MULTI/EXEC block
```

## Java - Jedis

```java
Transaction tx = jedis.multi();
tx.set("balance:alice", "100");
tx.set("balance:bob", "50");
tx.incrBy("balance:alice", 25);
tx.decrBy("balance:bob", 25);
List<Object> results = tx.exec();
// Jedis pipelines the MULTI/EXEC block automatically
```

## When Combining Makes Sense

| Scenario | Approach |
|---|---|
| Atomic writes, minimal round trips | pipeline(transaction=True) |
| Read-then-write atomicity | WATCH + pipeline(transaction=True) |
| Bulk independent writes | pipeline(transaction=False) |
| Read results mid-pipeline | Not possible - use separate commands |

## Error Handling

If any command in the MULTI/EXEC block has a syntax error (queued-time error), EXEC returns an error and the transaction aborts. Runtime errors (wrong type, etc.) only fail that individual command - other commands still execute:

```python
with r.pipeline() as pipe:
    pipe.set("num", 1)
    pipe.set("str", "hello")
    pipe.incr("str")  # runtime error - won't abort EXEC
    results = pipe.execute(raise_on_error=False)
# [True, True, ResponseError("WRONGTYPE")]
```

## Summary

Combining pipelining with transactions in Redis reduces network round trips to one while maintaining atomicity. In redis-py this is the default behavior of `pipeline()`. In go-redis, use `TxPipelined`. Add WATCH for optimistic locking when you need to read before writing. Use `transaction=False` / `Pipelined` only when atomicity is not required.
