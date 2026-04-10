# How to Use Redis Transactions in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Go, Transaction

Description: Learn how to use Redis MULTI/EXEC transactions and WATCH-based optimistic locking in Go with go-redis for atomic operations.

---

Redis transactions group commands with `MULTI`/`EXEC` to execute them atomically. go-redis exposes this through `TxPipelined` for simple batches and `Watch` for optimistic locking when you need to read a value and conditionally update it.

## Simple Transaction with TxPipelined

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/redis/go-redis/v9"
)

func transfer(ctx context.Context, rdb *redis.Client, from, to string, amount int64) error {
    _, err := rdb.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
        pipe.DecrBy(ctx, "balance:"+from, amount)
        pipe.IncrBy(ctx, "balance:"+to, amount)
        return nil
    })
    return err
}

func main() {
    ctx := context.Background()
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
    defer rdb.Close()

    rdb.Set(ctx, "balance:alice", "1000", 0)
    rdb.Set(ctx, "balance:bob", "500", 0)

    if err := transfer(ctx, rdb, "alice", "bob", 200); err != nil {
        log.Fatal(err)
    }

    alice, _ := rdb.Get(ctx, "balance:alice").Result()
    bob, _ := rdb.Get(ctx, "balance:bob").Result()
    fmt.Printf("Alice: %s, Bob: %s\n", alice, bob) // Alice: 800, Bob: 700
}
```

## Optimistic Locking with WATCH

`Watch` monitors keys and aborts the transaction if any watched key changes before `Exec`:

```go
func incrementIfEqual(ctx context.Context, rdb *redis.Client, key string, expected int64) error {
    return rdb.Watch(ctx, func(tx *redis.Tx) error {
        // Read the current value inside the watch
        current, err := tx.Get(ctx, key).Int64()
        if err != nil {
            return err
        }
        if current != expected {
            return fmt.Errorf("value changed, expected %d got %d", expected, current)
        }

        // Execute atomically - aborts if key changed since Watch
        _, err = tx.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
            pipe.Set(ctx, key, current+1, 0)
            return nil
        })
        return err
    }, key)
}
```

## Retry on Conflict

When another client modifies the watched key, `Watch` returns `redis.TxFailedErr`. Retry until success:

```go
func retryingUpdate(ctx context.Context, rdb *redis.Client, key string) error {
    const maxRetries = 5

    for i := 0; i < maxRetries; i++ {
        err := rdb.Watch(ctx, func(tx *redis.Tx) error {
            val, err := tx.Get(ctx, key).Int64()
            if err != nil && err != redis.Nil {
                return err
            }

            _, err = tx.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
                pipe.Set(ctx, key, val+1, 0)
                return nil
            })
            return err
        }, key)

        if err == nil {
            return nil
        }
        if err != redis.TxFailedErr {
            return err
        }
        // TxFailedErr means conflict - retry
    }
    return fmt.Errorf("transaction failed after %d retries", maxRetries)
}
```

## What Redis Transactions Do NOT Do

Redis transactions are not the same as database transactions:

- Commands in a `MULTI`/`EXEC` block are queued but not rolled back on error
- If one command fails at runtime, the others still execute
- Use `Watch` + `TxPipelined` for conditional updates, not for rollback behavior

```go
// Both commands execute even though LPush fails (wrong type for key1)
rdb.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
    pipe.Set(ctx, "key1", "val1", 0)
    pipe.LPush(ctx, "key1", "wrong-type") // will fail at execution, others proceed
    return nil
})
```

## Summary

`TxPipelined` wraps commands in `MULTI`/`EXEC` for atomic batched execution. `Watch` adds optimistic locking - the transaction aborts if a watched key is modified by another client before `Exec`. When `Watch` returns `redis.TxFailedErr`, retry the whole operation. Remember that Redis transactions do not provide rollback on runtime errors, only atomicity.
