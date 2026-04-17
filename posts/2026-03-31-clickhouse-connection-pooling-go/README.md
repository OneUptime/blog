# How to Implement Connection Pooling for ClickHouse in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Go, Connection Pool, Performance, Concurrency

Description: Configure and tune ClickHouse connection pooling in Go using the official client's built-in pool settings and the database/sql interface for maximum concurrency.

---

## Built-in Connection Pool

The official ClickHouse Go client (`clickhouse-go/v2`) has a built-in connection pool. You configure it through `clickhouse.Options`:

```go
import "github.com/ClickHouse/clickhouse-go/v2"

conn, err := clickhouse.Open(&clickhouse.Options{
    Addr: []string{"localhost:9000"},
    Auth: clickhouse.Auth{
        Database: "default",
        Username: "default",
        Password: "",
    },
    MaxOpenConns:    20,             // max active connections
    MaxIdleConns:    10,             // keep this many idle
    ConnMaxLifetime: time.Hour,      // recycle connections hourly
})
```

The pool is safe for concurrent use. Multiple goroutines can call `conn.Query` simultaneously.

## Using database/sql for Familiar Pooling API

The `clickhouse-go` driver also implements `database/sql`. This is useful if you already use `database/sql` conventions:

```go
import (
    "database/sql"
    _ "github.com/ClickHouse/clickhouse-go/v2"
)

db, err := sql.Open("clickhouse", "clickhouse://default:@localhost:9000/default")
if err != nil {
    log.Fatal(err)
}
db.SetMaxOpenConns(20)
db.SetMaxIdleConns(10)
db.SetConnMaxLifetime(time.Hour)
```

## Concurrent Query Example

Demonstrate the pool handling concurrent queries safely:

```go
var wg sync.WaitGroup
results := make([]uint64, 10)

for i := 0; i < 10; i++ {
    wg.Add(1)
    go func(idx int) {
        defer wg.Done()
        row := conn.QueryRow(context.Background(),
            "SELECT count() FROM events WHERE user_id = ?", idx*1000)
        _ = row.Scan(&results[idx])
    }(i)
}
wg.Wait()
fmt.Println("Results:", results)
```

Each goroutine acquires a connection from the pool, uses it, and returns it.

## Tuning Pool Size

ClickHouse handles queries internally with thread pools. The right client pool size depends on your workload:

- OLAP dashboards (many short queries): `MaxOpenConns = 20-50`
- Bulk insert pipeline (few large inserts): `MaxOpenConns = 4-8`
- Mixed workload: `MaxOpenConns = 10-20`

Too many connections increases ClickHouse memory overhead (each connection maintains context). Monitor with:

```sql
SELECT count() FROM system.processes;
SELECT metric, value FROM system.metrics WHERE metric = 'TCPConnection';
```

## Health Check and Pool Warmup

Warm up the pool at startup to avoid cold-start latency spikes:

```go
func warmupPool(conn clickhouse.Conn, size int) {
    var wg sync.WaitGroup
    for i := 0; i < size; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            conn.Ping(context.Background())
        }()
    }
    wg.Wait()
}
```

## Summary

ClickHouse Go connection pooling is built into `clickhouse-go/v2` via `MaxOpenConns`, `MaxIdleConns`, and `ConnMaxLifetime` settings. The pool is goroutine-safe by default. Tune pool size to your query pattern - more connections for concurrent dashboard queries, fewer for bulk insert pipelines. Monitor active connections in `system.metrics`.
