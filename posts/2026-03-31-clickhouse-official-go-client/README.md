# How to Use the Official ClickHouse Go Client

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Go, Client, Native Protocol, Query

Description: Get started with the official ClickHouse Go client - connect using the native protocol, execute queries, iterate over rows, and perform basic inserts.

---

## The Official Go Client

The official ClickHouse Go client (`github.com/ClickHouse/clickhouse-go/v2`) supports both the native binary protocol (port 9000) and the HTTP interface. The native protocol is faster for high-throughput use cases.

## Installation

```bash
go get github.com/ClickHouse/clickhouse-go/v2
```

## Connecting

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    "github.com/ClickHouse/clickhouse-go/v2"
)

func main() {
    conn, err := clickhouse.Open(&clickhouse.Options{
        Addr: []string{"localhost:9000"},
        Auth: clickhouse.Auth{
            Database: "default",
            Username: "default",
            Password: "",
        },
        DialTimeout:     10 * time.Second,
        MaxOpenConns:    10,
        MaxIdleConns:    5,
        ConnMaxLifetime: time.Hour,
    })
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    if err := conn.Ping(context.Background()); err != nil {
        log.Fatal("Ping failed:", err)
    }
    fmt.Println("Connected to ClickHouse")
}
```

## Executing Queries and Scanning Rows

```go
rows, err := conn.Query(context.Background(),
    "SELECT user_id, event_time, event_type FROM events WHERE event_date = today()")
if err != nil {
    log.Fatal(err)
}
defer rows.Close()

for rows.Next() {
    var (
        userID    uint64
        eventTime time.Time
        eventType string
    )
    if err := rows.Scan(&userID, &eventTime, &eventType); err != nil {
        log.Fatal(err)
    }
    fmt.Printf("User: %d Event: %s at %s\n", userID, eventType, eventTime)
}
if err := rows.Err(); err != nil {
    log.Fatal(err)
}
```

## Querying a Single Row

```go
var count uint64
row := conn.QueryRow(context.Background(),
    "SELECT count() FROM events WHERE user_id = ?", 42)
if err := row.Scan(&count); err != nil {
    log.Fatal(err)
}
fmt.Printf("Event count for user 42: %d\n", count)
```

## Inserting Data

```go
batch, err := conn.PrepareBatch(context.Background(),
    "INSERT INTO events (user_id, event_time, event_type, value)")
if err != nil {
    log.Fatal(err)
}

events := []struct {
    UserID    uint64
    EventTime time.Time
    EventType string
    Value     float64
}{
    {1, time.Now(), "login", 0},
    {2, time.Now(), "purchase", 99.99},
}

for _, e := range events {
    if err := batch.Append(e.UserID, e.EventTime, e.EventType, e.Value); err != nil {
        log.Fatal(err)
    }
}

if err := batch.Send(); err != nil {
    log.Fatal(err)
}
fmt.Println("Inserted", len(events), "rows")
```

## Using Context for Cancellation

```go
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()

rows, err := conn.Query(ctx, "SELECT count() FROM large_table")
```

## Summary

The official ClickHouse Go client provides a clean API for connecting via native protocol, scanning typed query results, and batch inserting rows. Use `PrepareBatch` for inserts to maximize throughput, and always pass `context.Context` for timeout and cancellation support.
