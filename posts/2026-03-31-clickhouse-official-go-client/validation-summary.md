# Validation Summary: How to Use the Official ClickHouse Go Client

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (database)
- Go (programming language)
- `github.com/ClickHouse/clickhouse-go/v2` (official ClickHouse Go client library)
- ClickHouse native binary protocol (port 9000)

## Sources Consulted
- Official ClickHouse Go client source code on GitHub: https://github.com/ClickHouse/clickhouse-go
- `clickhouse_options.go` — struct definition for `clickhouse.Options` field types
- `clickhouse.go` — `Open()` function signature and `driver.Conn` interface
- ClickHouse Go client documentation: https://clickhouse.com/docs/integrations/go

## Issues Found

### 1. `DialTimeout` and `ConnMaxLifetime` used incorrect types (plain integers instead of `time.Duration`)
- **What was wrong:** The connection example set `DialTimeout: 10` and `ConnMaxLifetime: 3600`. Both fields are typed as `time.Duration` in `clickhouse.Options`. Bare integer literals like `10` are interpreted as 10 nanoseconds, not 10 seconds — effectively a zero timeout that would cause immediate connection failures.
- **What was changed:** Updated to `DialTimeout: 10 * time.Second` and `ConnMaxLifetime: time.Hour`.
- **Why:** These are the correct `time.Duration` expressions matching the intended semantics (10-second dial timeout, 1-hour connection lifetime).

### 2. Missing `"time"` import in the connection example
- **What was wrong:** The connection example was a complete `package main` program but did not import `"time"`, which is needed for `time.Second` and `time.Hour`.
- **What was changed:** Added `"time"` to the import block.
- **Why:** Without this import, the code would not compile.

## Review Notes
- The `clickhouse.Open()` signature returning `(driver.Conn, error)` is correct.
- The `conn.QueryRow()` returning a single `Row` (not `(Row, error)`) is used correctly — the blog assigns only one value.
- Parameter placeholder syntax using `?` is correct for positional parameters in clickhouse-go v2.
- The `PrepareBatch` / `Append` / `Send` batch insert pattern is correct.
- All other code examples (Query, Scan, rows iteration, context usage) follow the correct API patterns.
