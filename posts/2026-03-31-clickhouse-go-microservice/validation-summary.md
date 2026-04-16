# Validation Summary: How to Build a Go Microservice with ClickHouse Backend

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go (standard library `net/http`, `context`, `os/signal`, `encoding/json`)
- ClickHouse (native TCP protocol on port 9000)
- clickhouse-go/v2 driver (`github.com/ClickHouse/clickhouse-go/v2`)
- Repository pattern / layered service architecture
- Graceful shutdown and Kubernetes-style health checks

## Sources Consulted
- clickhouse-go/v2 package docs: https://pkg.go.dev/github.com/ClickHouse/clickhouse-go/v2
- clickhouse-go/v2 driver interfaces: https://pkg.go.dev/github.com/ClickHouse/clickhouse-go/v2/lib/driver
- Go language spec, Order of Evaluation: https://go.dev/ref/spec#Order_of_evaluation
- ClickHouse SQL reference for `uniq` and `toDate`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq and https://clickhouse.com/docs/en/sql-reference/functions/type-conversion-functions
- Go `net/http` Server.Shutdown docs: https://pkg.go.dev/net/http#Server.Shutdown

## Issues Found
- **`GetDailyActiveUsers` return bug**: The original code used `return count, row.Scan(&count)`. Per the Go spec, operands in a return statement are evaluated with all function calls running in lexical left-to-right order — but the first operand `count` is read before `Scan` runs, so the caller would always receive the zero value regardless of what `Scan` wrote via the pointer. Fixed by performing `Scan` first, checking the error, then returning the populated `count`.

## Review Notes
- The clickhouse-go/v2 API usage (`clickhouse.Open`, `Options`, `Auth`, `QueryRow`, `PrepareBatch`, `batch.Append`, `batch.Send`, `Ping`, `Close`) is verified correct against the current driver surface.
- The `PrepareBatch` form `"INSERT INTO events (user_id, event_time, event_type)"` (column list, no `VALUES` clause) is the idiomatic form for this driver.
- `batch.Append` returns an `error` that the example ignores inside the loop; for a production service this should be checked, but it is acceptable brevity in an illustrative snippet and is not a correctness error.
- The example ignores errors from `clickhouse.Open` and `srv.ListenAndServe` for brevity. Mentioned only as a potential improvement — not a technical inaccuracy.
- Port `9000` is correct for ClickHouse's native TCP protocol used by the Go driver (HTTP would be `8123`).
- ClickHouse `uniq(...)` is an approximate HyperLogLog-based distinct count; `toDate(event_time)` correctly truncates a DateTime to a Date for day-level bucketing.
