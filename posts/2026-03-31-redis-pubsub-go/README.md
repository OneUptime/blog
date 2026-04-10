# How to Use Redis Pub/Sub in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Go, Pub/Sub

Description: Learn how to implement Redis Pub/Sub in Go using go-redis to publish messages and subscribe to channels with proper goroutine and error handling.

---

Redis Pub/Sub lets publishers send messages to channels without knowing who is listening. go-redis provides a `Subscribe` method that returns a `PubSub` object you can read messages from in a goroutine.

## Publisher

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    "github.com/redis/go-redis/v9"
)

func startPublisher(rdb *redis.Client) {
    ctx := context.Background()
    ticker := time.NewTicker(2 * time.Second)
    defer ticker.Stop()

    for range ticker.C {
        msg := fmt.Sprintf("event:%d", time.Now().Unix())
        err := rdb.Publish(ctx, "notifications", msg).Err()
        if err != nil {
            log.Printf("publish error: %v", err)
        } else {
            fmt.Printf("Published: %s\n", msg)
        }
    }
}
```

## Subscriber

```go
func startSubscriber(rdb *redis.Client) {
    ctx := context.Background()

    sub := rdb.Subscribe(ctx, "notifications")
    defer sub.Close()

    ch := sub.Channel()

    for msg := range ch {
        fmt.Printf("Received on %s: %s\n", msg.Channel, msg.Payload)
    }
}
```

## Subscribe to Multiple Channels

```go
sub := rdb.Subscribe(ctx, "channel:A", "channel:B", "channel:C")
defer sub.Close()

for msg := range sub.Channel() {
    fmt.Printf("[%s] %s\n", msg.Channel, msg.Payload)
}
```

## Pattern Subscription

```go
sub := rdb.PSubscribe(ctx, "user:*:events")
defer sub.Close()

for msg := range sub.Channel() {
    fmt.Printf("Pattern match on %s: %s\n", msg.Channel, msg.Payload)
}
```

## Full Example with Goroutines

```go
func main() {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
    defer rdb.Close()

    // Start subscriber in background
    go func() {
        sub := rdb.Subscribe(ctx, "events")
        defer sub.Close()

        for {
            select {
            case msg := <-sub.Channel():
                if msg == nil {
                    return // channel was closed
                }
                fmt.Printf("Got: %s\n", msg.Payload)
            case <-ctx.Done():
                return
            }
        }
    }()

    // Publish some messages
    time.Sleep(100 * time.Millisecond) // let subscriber connect
    for i := 1; i <= 5; i++ {
        rdb.Publish(ctx, "events", fmt.Sprintf("message-%d", i))
        time.Sleep(100 * time.Millisecond)
    }

    time.Sleep(500 * time.Millisecond)
}
```

## Handling Subscription Errors

```go
sub := rdb.Subscribe(ctx, "alerts")
defer sub.Close()

for {
    msg, err := sub.ReceiveMessage(ctx)
    if err != nil {
        if ctx.Err() != nil {
            return // context cancelled, clean exit
        }
        log.Printf("subscription error: %v", err)
        time.Sleep(time.Second)
        continue
    }
    fmt.Println(msg.Payload)
}
```

## Pub/Sub Limitations

- Messages are fire-and-forget - subscribers offline at publish time miss the message
- No persistence or acknowledgment
- For durable messaging, use Redis Streams instead

## Summary

go-redis Pub/Sub uses `Subscribe` and `PSubscribe` to receive messages from channels and patterns. Messages arrive on a Go channel returned by `sub.Channel()`. Use a goroutine to read messages continuously and check `ctx.Done()` for graceful shutdown. For use cases requiring message durability or replay, Redis Streams is a more appropriate choice.
