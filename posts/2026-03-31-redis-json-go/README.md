# How to Use Redis JSON with Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Go, RedisJSON

Description: Learn how to store, retrieve, and update JSON documents in Redis from Go using the RedisJSON module with go-redis.

---

RedisJSON adds native JSON storage and manipulation to Redis. From Go, you can use go-redis with the `JSON.SET` and `JSON.GET` commands to store complex objects without serializing them manually to a string.

## Setup

Ensure Redis Stack or the RedisJSON module is running:

```bash
docker run -d -p 6379:6379 redis/redis-stack:latest
```

Install go-redis:

```bash
go get github.com/redis/go-redis/v9
```

## Store a JSON Document

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

    // Store JSON document using JSONSet
    doc := `{
        "name": "Alice",
        "age": 30,
        "email": "alice@example.com",
        "roles": ["admin", "user"],
        "address": {"city": "Portland", "zip": "97201"}
    }`

    err := rdb.Do(ctx, "JSON.SET", "user:1", "$", doc).Err()
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println("Stored")
}
```

## Retrieve the Document

```go
// Get full document
result, err := rdb.Do(ctx, "JSON.GET", "user:1").Text()
if err != nil {
    log.Fatal(err)
}
fmt.Println(result)

// Get nested field using JSONPath
name, err := rdb.Do(ctx, "JSON.GET", "user:1", "$.name").Text()
fmt.Println(name) // ["Alice"]

city, err := rdb.Do(ctx, "JSON.GET", "user:1", "$.address.city").Text()
fmt.Println(city) // ["Portland"]
```

## Update a Field

```go
// Update age
rdb.Do(ctx, "JSON.SET", "user:1", "$.age", "31")

// Append to an array
rdb.Do(ctx, "JSON.ARRAPPEND", "user:1", "$.roles", `"moderator"`)
```

## Decode into a Struct

```go
import "encoding/json"

type User struct {
    Name    string   `json:"name"`
    Age     int      `json:"age"`
    Email   string   `json:"email"`
    Roles   []string `json:"roles"`
}

func getUser(ctx context.Context, rdb *redis.Client, id string) (*User, error) {
    raw, err := rdb.Do(ctx, "JSON.GET", "user:"+id).Text()
    if err != nil {
        return nil, err
    }
    var user User
    if err := json.Unmarshal([]byte(raw), &user); err != nil {
        return nil, err
    }
    return &user, nil
}
```

## Store a Go Struct Directly

```go
func storeUser(ctx context.Context, rdb *redis.Client, id string, u User) error {
    data, err := json.Marshal(u)
    if err != nil {
        return err
    }
    return rdb.Do(ctx, "JSON.SET", "user:"+id, "$", string(data)).Err()
}
```

## Numeric Operations

```go
// Increment a numeric field
rdb.Do(ctx, "JSON.NUMINCRBY", "user:1", "$.age", 1)
```

## Delete a Field

```go
rdb.Do(ctx, "JSON.DEL", "user:1", "$.address")
```

## Check Key and Type

```go
exists, _ := rdb.Exists(ctx, "user:1").Result()
fmt.Println(exists) // 1

typeResult, _ := rdb.Do(ctx, "JSON.TYPE", "user:1", "$.roles").StringSlice()
fmt.Println(typeResult) // [array]
```

## Summary

go-redis accesses RedisJSON through the `Do` method with raw command strings like `JSON.SET`, `JSON.GET`, and `JSON.ARRAPPEND`. Documents are stored as strings and decoded with `encoding/json`. This approach gives you full JSONPath support for querying nested fields and avoids maintaining separate serialization logic compared to storing JSON in plain Redis string keys.
