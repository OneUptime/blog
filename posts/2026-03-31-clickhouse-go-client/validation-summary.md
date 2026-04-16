# Validation Summary: How to Use ClickHouse Go Client (clickhouse-go)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (database, MergeTree engine, DateTime64, LowCardinality, Map types, async inserts)
- Go (language)
- clickhouse-go v2 (official ClickHouse Go driver, native + HTTP protocols)
- google/uuid (UUID generation library)
- Go `database/sql` standard package

## Sources Consulted
- Official clickhouse-go repository: https://github.com/ClickHouse/clickhouse-go
- clickhouse-go v2 source (`options.go`, `clickhouse.go`, `context.go`, `rows.go`, `struct_map.go`, `lib/proto/exception.go`, `lib/driver/driver.go`)
- ClickHouse async insert documentation (`async_insert`, `wait_for_async_insert` settings)

## Issues Found

1. **`DialTimeout: 10` interpreted as 10 nanoseconds.** `Options.DialTimeout` is a `time.Duration` (int64 nanoseconds), so the literal `10` meant 10ns, not 10 seconds. Changed to `10 * time.Second` and added `"time"` to the import block.

2. **`ConnMaxLifetime: 3600` interpreted as 3600 nanoseconds.** Same issue — `ConnMaxLifetime` is a `time.Duration`. Changed to `time.Hour` to match the clearly intended 1-hour lifetime.

3. **Async insert settings passed as a positional arg to `Exec`.** `conn.Exec(ctx, query, args...)` treats every variadic arg as a query parameter, so passing `clickhouse.Settings{...}` inline would fail (or bind the map as a parameter). In clickhouse-go v2, query-level settings must be attached via `clickhouse.Context(ctx, clickhouse.WithSettings(...))`. Rewrote the async insert example to build an `asyncCtx` via `clickhouse.WithSettings` and pass that to `Exec`.

## Review Notes
- `clickhouse.Exception` has additional fields beyond the three shown (`Name string`, `Nested []Exception`, and `Code` is `int32` not `int`). The example's formatting still works correctly with `%d` on an `int32`, so no change was made — the snippet illustrates the type assertion pattern without needing to enumerate every field.
- The struct tag format (`ch:"column_name"`) used with `ScanStruct` is correct and matches the `f.Tag.Get("ch")` lookup in `struct_map.go`.
- `clickhouse.Open`, `clickhouse.HTTP` protocol constant, `clickhouse.CompressionLZ4`, `PrepareBatch`/`Append`/`Send` flow, `?` placeholder parameters, and the `database/sql` DSN format (`clickhouse://...`) are all accurate for v2.
- UUID columns can be scanned into a `string` field — the v2 driver supports this conversion — so the `EventID string` field in the `Event` struct is fine.
- The connection-wide `Settings` field on `Options` is distinct from per-query settings via context; both patterns are valid and the post uses each appropriately after the fix.
