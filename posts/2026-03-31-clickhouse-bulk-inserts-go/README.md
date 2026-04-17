# How to Handle Bulk Inserts in ClickHouse from Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Go, Bulk Insert, Performance, Batch

Description: Implement efficient bulk inserts into ClickHouse from Go using PrepareBatch, handle backpressure, batch sizing, and concurrent insert pipelines.

---

## Why Bulk Inserts Matter

Each ClickHouse INSERT creates a new data part. Small inserts (a few rows each) create thousands of parts, triggering the "Too many parts" error and degrading query performance. Bulk inserts combine rows into large batches, creating fewer, larger parts.

## Basic Bulk Insert with PrepareBatch

```go
package main

import (
    "context"
    "log"
    "time"

    "github.com/ClickHouse/clickhouse-go/v2"
)

type Event struct {
    UserID    uint64
    EventTime time.Time
    EventType string
    Value     float64
}

func bulkInsert(conn clickhouse.Conn, events []Event) error {
    batch, err := conn.PrepareBatch(context.Background(),
        "INSERT INTO events (user_id, event_time, event_type, value)")
    if err != nil {
        return err
    }

    for _, e := range events {
        if err := batch.Append(e.UserID, e.EventTime, e.EventType, e.Value); err != nil {
            return err
        }
    }

    return batch.Send()
}
```

## Buffered Channel Insert Pipeline

Buffer incoming events and flush when batch is full or a timeout fires:

```go
func insertPipeline(conn clickhouse.Conn, events <-chan Event) {
    const batchSize = 10_000
    const flushInterval = 500 * time.Millisecond

    buffer := make([]Event, 0, batchSize)
    ticker := time.NewTicker(flushInterval)
    defer ticker.Stop()

    flush := func() {
        if len(buffer) == 0 {
            return
        }
        if err := bulkInsert(conn, buffer); err != nil {
            log.Printf("Insert error: %v", err)
        }
        buffer = buffer[:0]
    }

    for {
        select {
        case e, ok := <-events:
            if !ok {
                flush()
                return
            }
            buffer = append(buffer, e)
            if len(buffer) >= batchSize {
                flush()
            }
        case <-ticker.C:
            flush()
        }
    }
}
```

## Concurrent Insert Workers

For very high throughput, run multiple insert goroutines:

```go
func startInsertWorkers(conn clickhouse.Conn, jobs <-chan []Event, workerCount int) {
    var wg sync.WaitGroup
    for i := 0; i < workerCount; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for batch := range jobs {
                if err := bulkInsert(conn, batch); err != nil {
                    log.Printf("Worker insert error: %v", err)
                }
            }
        }()
    }
    wg.Wait()
}
```

## Choosing Batch Size

| Row Size | Recommended Batch |
|---|---|
| Small (100 bytes) | 50,000-100,000 rows |
| Medium (1 KB) | 5,000-10,000 rows |
| Large (10 KB) | 500-1,000 rows |

Target 1-10 MB per insert batch for optimal part sizes.

## Monitoring Insert Performance

```sql
SELECT event_time, rows, size_in_bytes
FROM system.part_log
WHERE event_type = 'NewPart' AND table = 'events'
ORDER BY event_time DESC
LIMIT 10;
```

## Summary

Go bulk inserts into ClickHouse use `PrepareBatch` to accumulate rows and `Send` to flush them. A channel-based pipeline with time-based and size-based flush triggers balances latency and throughput. Multiple concurrent insert workers can saturate ClickHouse write bandwidth. Target 1-10 MB batches to create healthy part sizes.
