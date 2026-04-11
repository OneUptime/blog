# How to Use Redis Lists in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Go, List

Description: Learn how to use Redis lists in Go with go-redis for push, pop, range queries, and building simple queues and stacks.

---

Redis lists are ordered sequences of strings backed by a doubly-linked list. They support O(1) push and pop at both ends, making them ideal for queues, stacks, activity feeds, and recent-items lists.

## Push and Pop

```go
package main

import (
    "context"
    "fmt"

    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
    defer rdb.Close()

    // LPUSH - push to left (head)
    rdb.LPush(ctx, "mylist", "c", "b", "a")
    // list is now: [a, b, c]

    // RPUSH - push to right (tail)
    rdb.RPush(ctx, "mylist", "d", "e")
    // list is now: [a, b, c, d, e]

    // LPOP - remove and return from left
    val, _ := rdb.LPop(ctx, "mylist").Result()
    fmt.Println(val) // a

    // RPOP - remove and return from right
    val, _ = rdb.RPop(ctx, "mylist").Result()
    fmt.Println(val) // e
}
```

## Range and Index Access

```go
// Get elements by range (0 to -1 = all elements)
items, _ := rdb.LRange(ctx, "mylist", 0, -1).Result()
fmt.Println(items) // [b c d]

// Get element by index
item, _ := rdb.LIndex(ctx, "mylist", 0).Result()
fmt.Println(item) // b

// Get list length
length, _ := rdb.LLen(ctx, "mylist").Result()
fmt.Println(length) // 3
```

## Simple Queue (FIFO)

```go
func enqueue(ctx context.Context, rdb *redis.Client, queue, item string) error {
    return rdb.RPush(ctx, queue, item).Err()
}

func dequeue(ctx context.Context, rdb *redis.Client, queue string) (string, error) {
    return rdb.LPop(ctx, queue).Result()
}
```

## Blocking Queue (Worker Pattern)

```go
func worker(ctx context.Context, rdb *redis.Client) {
    for {
        // Block up to 5 seconds waiting for a new item
        result, err := rdb.BLPop(ctx, 5*time.Second, "jobs:queue").Result()
        if err == redis.Nil {
            fmt.Println("No jobs, waiting...")
            continue
        }
        if err != nil {
            if ctx.Err() != nil {
                return
            }
            log.Printf("BLPop error: %v", err)
            continue
        }
        // result[0] = key name, result[1] = value
        fmt.Printf("Processing job: %s\n", result[1])
    }
}
```

## Stack (LIFO)

```go
// Push to left, pop from left
rdb.LPush(ctx, "stack", "first")
rdb.LPush(ctx, "stack", "second")
rdb.LPush(ctx, "stack", "third")

top, _ := rdb.LPop(ctx, "stack").Result()
fmt.Println(top) // third
```

## Update an Element

```go
// Set element at index 1 to a new value
rdb.LSet(ctx, "mylist", 1, "new-value")
```

## Remove Elements

```go
// Remove 2 occurrences of "b" from the left
removed, _ := rdb.LRem(ctx, "mylist", 2, "b").Result()
fmt.Printf("Removed %d elements\n", removed)

// Trim to keep only elements from index 0 to 99
rdb.LTrim(ctx, "recent:activity", 0, 99)
```

## Recent Activity Feed

```go
func recordActivity(ctx context.Context, rdb *redis.Client, userId, event string) {
    key := "activity:" + userId
    rdb.LPush(ctx, key, event)
    rdb.LTrim(ctx, key, 0, 99) // keep last 100 events
}

func getRecentActivity(ctx context.Context, rdb *redis.Client, userId string) []string {
    items, _ := rdb.LRange(ctx, "activity:"+userId, 0, 9).Result()
    return items
}
```

## Summary

Redis lists in Go support push/pop at both ends with O(1) performance. `LPush`/`RPush` add elements, `LPop`/`RPop` remove them, and `LRange` retrieves slices. `BLPop` blocks until an item is available, making it ideal for job queues without polling. Use `LTrim` to cap list size and prevent unbounded growth.
