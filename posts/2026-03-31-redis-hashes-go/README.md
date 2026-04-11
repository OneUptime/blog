# How to Use Redis Hashes in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Go, Hash

Description: Learn how to store, retrieve, update, and delete hash fields in Redis from Go using go-redis with practical examples for object storage.

---

Redis hashes map string field-value pairs under a single key. They are ideal for storing structured objects like user profiles, product data, or configuration records. go-redis exposes hash commands through methods like `HSet`, `HGet`, `HGetAll`, and `HMGet`.

## Set and Get Hash Fields

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
    defer rdb.Close()

    // Set multiple fields at once
    err := rdb.HSet(ctx, "user:1",
        "name", "Alice",
        "email", "alice@example.com",
        "age", "30",
        "role", "admin",
    ).Err()
    if err != nil {
        log.Fatal(err)
    }

    // Get a single field
    name, _ := rdb.HGet(ctx, "user:1", "name").Result()
    fmt.Println(name) // Alice

    // Get multiple fields
    vals, _ := rdb.HMGet(ctx, "user:1", "name", "email").Result()
    fmt.Println(vals) // [Alice alice@example.com]
}
```

## Get All Fields

```go
all, err := rdb.HGetAll(ctx, "user:1").Result()
if err != nil {
    log.Fatal(err)
}
for field, value := range all {
    fmt.Printf("%s: %s\n", field, value)
}
```

## Struct Scanning

go-redis can scan hash fields directly into a struct:

```go
type User struct {
    Name  string `redis:"name"`
    Email string `redis:"email"`
    Age   int    `redis:"age"`
    Role  string `redis:"role"`
}

var user User
err = rdb.HGetAll(ctx, "user:1").Scan(&user)
if err != nil {
    log.Fatal(err)
}
fmt.Printf("Name: %s, Role: %s\n", user.Name, user.Role)
```

## Increment a Hash Field

```go
// Increment numeric field
newAge, _ := rdb.HIncrBy(ctx, "user:1", "age", 1).Result()
fmt.Println(newAge) // 31

// Increment float field
rdb.HIncrByFloat(ctx, "product:1", "price", 0.50)
```

## Conditional Set

```go
// Only set if field does not exist
set, _ := rdb.HSetNX(ctx, "user:1", "verified", "false").Result()
fmt.Println(set) // true if field was new, false if it already existed
```

## Delete Fields

```go
deleted, _ := rdb.HDel(ctx, "user:1", "role", "verified").Result()
fmt.Printf("Deleted %d fields\n", deleted)
```

## Check Field Existence

```go
exists, _ := rdb.HExists(ctx, "user:1", "email").Result()
fmt.Println(exists) // true
```

## List Keys and Values

```go
keys, _ := rdb.HKeys(ctx, "user:1").Result()
fmt.Println(keys) // [name email age]

values, _ := rdb.HVals(ctx, "user:1").Result()
fmt.Println(values) // [Alice alice@example.com 31]

count, _ := rdb.HLen(ctx, "user:1").Result()
fmt.Println(count) // 3
```

## Storing a Struct as a Hash

```go
product := map[string]interface{}{
    "name":     "Widget",
    "price":    "9.99",
    "stock":    "100",
    "category": "tools",
}
rdb.HSet(ctx, "product:42", product)
```

## Summary

Redis hashes in Go use `HSet` for setting fields, `HGet` and `HGetAll` for retrieval, and `HDel` for deletion. The `Scan` method on `HGetAll` results can map hash fields directly to struct fields using `redis` struct tags. Hashes are more memory-efficient than storing each field as a separate string key, especially for objects with many fields.
