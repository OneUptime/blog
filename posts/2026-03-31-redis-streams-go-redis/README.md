# How to Use Redis Streams in Go with go-redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Go, Stream

Description: Learn how to produce and consume messages using Redis Streams in Go with go-redis, including consumer groups and acknowledgment.

---

Redis Streams provide durable, ordered, append-only message logs. Unlike Pub/Sub, messages persist in the stream until explicitly deleted. go-redis exposes the full Streams API including consumer groups for parallel processing.

## Produce Messages

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    "github.com/redis/go-redis/v9"
)

func produce(ctx context.Context, rdb *redis.Client) {
    for i := 0; i < 5; i++ {
        id, err := rdb.XAdd(ctx, &redis.XAddArgs{
            Stream: "orders",
            Values: map[string]interface{}{
                "orderId": fmt.Sprintf("ord-%03d", i+1),
                "amount":  (i + 1) * 10,
                "status":  "pending",
            },
        }).Result()
        if err != nil {
            log.Fatal(err)
        }
        fmt.Printf("Added message ID: %s\n", id)
    }
}
```

## Read Messages (Simple Consumer)

```go
func readSimple(ctx context.Context, rdb *redis.Client) {
    messages, err := rdb.XRange(ctx, "orders", "-", "+").Result()
    if err != nil {
        log.Fatal(err)
    }
    for _, msg := range messages {
        fmt.Printf("ID: %s, Values: %v\n", msg.ID, msg.Values)
    }
}
```

## Create a Consumer Group

```go
// Create group starting from the first message
err := rdb.XGroupCreateMkStream(ctx, "orders", "processors", "0").Err()
if err != nil && err.Error() != "BUSYGROUP Consumer Group name already exists" {
    log.Fatal(err)
}
```

## Consumer Group - Read and Acknowledge

```go
func consumeWithGroup(ctx context.Context, rdb *redis.Client, consumer string) {
    for {
        streams, err := rdb.XReadGroup(ctx, &redis.XReadGroupArgs{
            Group:    "processors",
            Consumer: consumer,
            Streams:  []string{"orders", ">"},
            Count:    10,
            Block:    2 * time.Second, // block 2 seconds waiting for new messages
        }).Result()
        if err == redis.Nil {
            continue // no new messages
        }
        if err != nil {
            log.Printf("read error: %v", err)
            continue
        }

        for _, stream := range streams {
            for _, msg := range stream.Messages {
                fmt.Printf("[%s] Processing: %v\n", consumer, msg.Values)

                // Acknowledge after processing
                rdb.XAck(ctx, "orders", "processors", msg.ID)
            }
        }
    }
}
```

## Process Pending (Unacknowledged) Messages

```go
func recoverPending(ctx context.Context, rdb *redis.Client) {
    // Read messages delivered but not yet acknowledged
    pending, err := rdb.XReadGroup(ctx, &redis.XReadGroupArgs{
        Group:    "processors",
        Consumer: "recovery-worker",
        Streams:  []string{"orders", "0"}, // "0" = pending messages for this consumer
        Count:    100,
    }).Result()
    if err != nil {
        log.Fatal(err)
    }

    for _, stream := range pending {
        for _, msg := range stream.Messages {
            fmt.Printf("Reprocessing pending: %s\n", msg.ID)
            rdb.XAck(ctx, "orders", "processors", msg.ID)
        }
    }
}
```

## Trim Stream Size

```go
// Keep only the last 1000 messages
rdb.XTrimMaxLen(ctx, "orders", 1000)

// Approximate trim (faster, may keep slightly more)
rdb.XTrimMaxLenApprox(ctx, "orders", 1000, 0)
```

## Stream Info

```go
info, err := rdb.XInfoStream(ctx, "orders").Result()
fmt.Printf("Length: %d, First ID: %s\n", info.Length, info.FirstEntry.ID)

groups, _ := rdb.XInfoGroups(ctx, "orders").Result()
for _, g := range groups {
    fmt.Printf("Group: %s, Pending: %d\n", g.Name, g.Pending)
}
```

## Summary

Redis Streams in Go use `XAdd` to produce messages and `XReadGroup` to consume them with consumer groups. Acknowledging messages with `XAck` removes them from the pending list. Reading with ID `"0"` instead of `">"` retrieves pending but unacknowledged messages, useful for crash recovery. Consumer groups enable multiple workers to share a stream without duplicate processing.
