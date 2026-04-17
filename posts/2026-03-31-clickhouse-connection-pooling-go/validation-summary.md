# Validation Summary: How to Implement Connection Pooling for ClickHouse in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- Go (Golang)
- `clickhouse-go/v2` official driver
- Go `database/sql` package
- Go concurrency primitives (`sync.WaitGroup`, goroutines, `context`)

## Sources Consulted
- ClickHouse Go driver source code: https://github.com/ClickHouse/clickhouse-go (v2, `main` branch)
- `clickhouse_options.go` — Options struct definition
- `clickhouse_std.go` — `OpenDB` and `database/sql` driver registration
- ClickHouse system tables documentation: https://clickhouse.com/docs/en/operations/system-tables/metrics
- ClickHouse system.processes documentation: https://clickhouse.com/docs/en/operations/system-tables/processes

## Issues Found

1. **Invalid `ConnMaxIdleTime` field on `clickhouse.Options`.** The original code configured `ConnMaxIdleTime: time.Minute * 5` inside `&clickhouse.Options{...}`. This field does not exist on the `clickhouse.Options` struct. The native driver's `Options` struct only exposes `MaxOpenConns`, `MaxIdleConns`, and `ConnMaxLifetime` for pool configuration. `SetConnMaxIdleTime` only exists on `*sql.DB` (the standard `database/sql` interface). Removed the invalid field and realigned struct field spacing. (`ConnMaxIdleTime` would cause a compile error: "unknown field in struct literal".)

## Review Notes

- The `database/sql` example using `sql.Open("clickhouse", "clickhouse://...")` is valid — the `clickhouse-go/v2` package registers the `"clickhouse"` driver name via an `init()` function. An alternative type-safe approach is `clickhouse.OpenDB(&clickhouse.Options{...})` which returns `*sql.DB` directly; this is often recommended in the official docs but not required.
- The native DSN format `clickhouse://default:@localhost:9000/default` is correct for the TCP native protocol on port 9000.
- `conn.QueryRow(ctx, sql, args...)` is the correct native v2 API signature.
- `TCPConnection` is the correct metric name in `system.metrics` (singular, not pluralized).
- `system.processes` correctly surfaces currently-running queries.
- The recommended pool sizes in the "Tuning Pool Size" section are reasonable ballpark heuristics, not prescriptive — they depend heavily on workload and ClickHouse server resources.
- The snippets omit `import "time"`, `import "context"`, etc. — expected for focused code excerpts.
