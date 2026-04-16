# How to Use ClickHouse Go Client (clickhouse-go)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Go, Client, Integration, Driver

Description: Learn how to connect to ClickHouse from Go using clickhouse-go, including inserting rows, querying data, using batch inserts, and configuring connection pools.

---

`clickhouse-go` is the official Go client for ClickHouse maintained by the ClickHouse team. It supports both the native binary protocol (port 9000) and the HTTP interface, type-safe row scanning, batch inserts, and `database/sql` compatibility. This guide walks through everything from initial setup to production-grade connection management.

## Installation

```bash
go get github.com/ClickHouse/clickhouse-go/v2
```

## Connecting with the Native Protocol

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
		Addr: []string{"127.0.0.1:9000"},
		Auth: clickhouse.Auth{
			Database: "default",
			Username: "default",
			Password: "",
		},
		Settings: clickhouse.Settings{
			"max_execution_time": 60,
		},
		DialTimeout:      10 * time.Second,
		MaxOpenConns:     10,
		MaxIdleConns:     5,
		ConnMaxLifetime:  time.Hour,
		Compression: &clickhouse.Compression{
			Method: clickhouse.CompressionLZ4,
		},
	})
	if err != nil {
		log.Fatal(err)
	}
	defer conn.Close()

	if err := conn.Ping(context.Background()); err != nil {
		log.Fatal("ping failed:", err)
	}
	fmt.Println("Connected to ClickHouse")
}
```

## Create a Table

```go
ctx := context.Background()

err = conn.Exec(ctx, `
    CREATE TABLE IF NOT EXISTS events (
        event_id   UUID,
        user_id    UInt64,
        event_name LowCardinality(String),
        created_at DateTime64(3),
        properties Map(String, String)
    )
    ENGINE = MergeTree()
    PARTITION BY toYYYYMM(created_at)
    ORDER BY (user_id, created_at)
`)
if err != nil {
    log.Fatal(err)
}
```

## Batch Insert (Recommended for High Throughput)

```go
package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/google/uuid"
)

func batchInsert(conn clickhouse.Conn) error {
	ctx := context.Background()

	batch, err := conn.PrepareBatch(ctx, "INSERT INTO events")
	if err != nil {
		return fmt.Errorf("prepare batch: %w", err)
	}

	for i := 0; i < 10000; i++ {
		err := batch.Append(
			uuid.New(),                                  // event_id
			uint64(i%1000),                              // user_id
			"page_view",                                 // event_name
			time.Now(),                                  // created_at
			map[string]string{"page": "/home", "ref": "google"}, // properties
		)
		if err != nil {
			return fmt.Errorf("append row %d: %w", i, err)
		}
	}

	if err := batch.Send(); err != nil {
		return fmt.Errorf("send batch: %w", err)
	}
	fmt.Println("Batch inserted 10,000 rows")
	return nil
}
```

## Query with Row Scanning

```go
type Event struct {
	EventID   string
	UserID    uint64
	EventName string
	CreatedAt time.Time
}

func queryEvents(conn clickhouse.Conn) ([]Event, error) {
	ctx := context.Background()

	rows, err := conn.Query(ctx, `
		SELECT event_id, user_id, event_name, created_at
		FROM events
		WHERE created_at >= ?
		  AND event_name = ?
		ORDER BY created_at DESC
		LIMIT 100
	`, time.Now().Add(-24*time.Hour), "page_view")
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}
	defer rows.Close()

	var events []Event
	for rows.Next() {
		var e Event
		if err := rows.Scan(
			&e.EventID,
			&e.UserID,
			&e.EventName,
			&e.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}
		events = append(events, e)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}
	return events, nil
}
```

## Query a Single Row

```go
var count uint64
err = conn.QueryRow(ctx,
	"SELECT count() FROM events WHERE user_id = ?", 42,
).Scan(&count)
if err != nil {
	log.Fatal(err)
}
fmt.Printf("User 42 has %d events\n", count)
```

## Use Struct Tags with ScanStruct

```go
type EventSummary struct {
	UserID     uint64    `ch:"user_id"`
	EventCount uint64    `ch:"event_count"`
	FirstSeen  time.Time `ch:"first_seen"`
	LastSeen   time.Time `ch:"last_seen"`
}

rows, err := conn.Query(ctx, `
	SELECT
		user_id,
		count()   AS event_count,
		min(created_at) AS first_seen,
		max(created_at) AS last_seen
	FROM events
	GROUP BY user_id
	ORDER BY event_count DESC
	LIMIT 10
`)
if err != nil {
	log.Fatal(err)
}
defer rows.Close()

for rows.Next() {
	var s EventSummary
	if err := rows.ScanStruct(&s); err != nil {
		log.Fatal(err)
	}
	fmt.Printf("User %d: %d events (%s to %s)\n",
		s.UserID, s.EventCount,
		s.FirstSeen.Format(time.RFC3339),
		s.LastSeen.Format(time.RFC3339))
}
```

## Use database/sql Interface

```go
package main

import (
	"database/sql"
	"log"

	_ "github.com/ClickHouse/clickhouse-go/v2"
)

func openSQL() *sql.DB {
	dsn := "clickhouse://default:password@127.0.0.1:9000/default?dial_timeout=10s&max_execution_time=60"
	db, err := sql.Open("clickhouse", dsn)
	if err != nil {
		log.Fatal(err)
	}
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	return db
}
```

## Async Insert

ClickHouse supports asynchronous inserts where the server buffers small inserts and flushes them in batches:

```go
asyncCtx := clickhouse.Context(ctx, clickhouse.WithSettings(clickhouse.Settings{
	"async_insert":          1,
	"wait_for_async_insert": 0,
}))
err = conn.Exec(asyncCtx,
	"INSERT INTO events VALUES (?, ?, ?, ?, ?)",
	uuid.New(), uint64(1), "click", time.Now(), map[string]string{},
)
```

## Error Handling and Exception Types

```go
if exception, ok := err.(*clickhouse.Exception); ok {
	fmt.Printf("ClickHouse exception [%d] %s\n%s\n",
		exception.Code,
		exception.Message,
		exception.StackTrace,
	)
}
```

## Connect via HTTP Interface

```go
conn, err := clickhouse.Open(&clickhouse.Options{
	Protocol: clickhouse.HTTP,
	Addr:     []string{"127.0.0.1:8123"},
	Auth: clickhouse.Auth{
		Database: "default",
		Username: "default",
		Password: "",
	},
})
```

## Complete Working Example

```go
package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/google/uuid"
)

func main() {
	conn, err := clickhouse.Open(&clickhouse.Options{
		Addr: []string{"127.0.0.1:9000"},
		Auth: clickhouse.Auth{Database: "default", Username: "default"},
	})
	if err != nil {
		log.Fatal(err)
	}
	defer conn.Close()

	ctx := context.Background()

	// Create table
	if err := conn.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS page_views (
			id         UUID,
			user_id    UInt64,
			page       String,
			visited_at DateTime
		) ENGINE = MergeTree()
		ORDER BY (user_id, visited_at)
	`); err != nil {
		log.Fatal(err)
	}

	// Batch insert
	batch, err := conn.PrepareBatch(ctx, "INSERT INTO page_views")
	if err != nil {
		log.Fatal(err)
	}
	pages := []string{"/home", "/about", "/pricing", "/blog"}
	for i := 0; i < 100; i++ {
		_ = batch.Append(
			uuid.New(),
			uint64(i%10),
			pages[i%len(pages)],
			time.Now().Add(-time.Duration(i)*time.Minute),
		)
	}
	if err := batch.Send(); err != nil {
		log.Fatal(err)
	}

	// Query
	rows, err := conn.Query(ctx,
		"SELECT page, count() AS views FROM page_views GROUP BY page ORDER BY views DESC")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	fmt.Println("Page views:")
	for rows.Next() {
		var page string
		var views uint64
		if err := rows.Scan(&page, &views); err != nil {
			log.Fatal(err)
		}
		fmt.Printf("  %-20s %d\n", page, views)
	}
}
```

## Common Pitfalls

- Always use `PrepareBatch` for bulk inserts rather than individual `Exec` calls. Each individual INSERT is a separate network round trip and creates a new part on disk.
- Close `rows` with `defer rows.Close()` immediately after the query call, not at the end of the function, to release the connection back to the pool promptly.
- Use `?` placeholders rather than string formatting to build queries. String formatting is vulnerable to SQL injection and bypasses ClickHouse's parameter escaping.
- The native protocol (port 9000) is significantly faster than HTTP for large result sets because it uses binary encoding.

## Summary

`clickhouse-go` provides a high-performance, idiomatic Go interface to ClickHouse. Use `PrepareBatch` for writes, `Query`/`QueryRow` for reads, and `ScanStruct` to reduce boilerplate. The client supports both the native binary protocol and HTTP, making it suitable for everything from microservices to bulk data pipelines.
