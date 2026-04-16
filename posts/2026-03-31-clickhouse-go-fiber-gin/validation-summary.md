# Validation Summary: How to Use ClickHouse with Go (Fiber and Gin)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (database and SQL schema, MergeTree engine, async inserts)
- Go (module setup, idiomatic repository pattern)
- clickhouse-go/v2 official driver (native protocol on port 9000)
- Fiber v2 web framework
- Gin web framework
- JSON encoding and HTTP handlers

## Sources Consulted
- clickhouse-go GitHub repository — https://github.com/ClickHouse/clickhouse-go
- clickhouse-go main clickhouse.go source — confirmed `AsyncInsert(ctx, query, wait bool, args ...any) error` signature
- ClickHouse Go integration docs — https://clickhouse.com/docs/integrations/go
- ClickHouse SQL reference (MergeTree, DateTime64, LowCardinality, generateUUIDv4, toStartOfHour, uniq, INTERVAL)
- Fiber v2 API (`fiber.Ctx`, `BodyParser`, `Status`, `JSON`, `Query`, `Context()`, `Listen`)
- Gin API (`gin.Context`, `ShouldBindJSON`, `DefaultQuery`, `Request.Context()`, `Run`)

## Issues Found
No technical issues found. All code examples compile against the stated dependencies and use correct APIs:
- `clickhouse.Options` fields (Addr, Auth, Debug, DialTimeout, MaxOpenConns, MaxIdleConns, ConnMaxLifetime, ConnOpenStrategy, Settings, TLS) are valid.
- `driver.Conn` methods used (`Ping`, `Exec`, `Query`, `PrepareBatch`, `AsyncInsert`) are correct.
- `PrepareBatch` + `batch.Append` + `batch.Send` usage matches driver semantics.
- ClickHouse schema and SQL (MergeTree, PARTITION BY toYYYYMM, ORDER BY tuple, DateTime64(3), LowCardinality, UUID DEFAULT generateUUIDv4()) are valid.
- Server-side async insert settings (`async_insert`, `wait_for_async_insert`) are correct.
- Fiber v2 and Gin handler/router APIs are correct for their current stable releases.
- Parameterized queries with `?` placeholders (including inside `INTERVAL ? DAY/HOUR`) are handled via client-side substitution by the driver.

## Review Notes
- The `driver.Conn.AsyncInsert` method used in the Async Inserts section is marked as deprecated in recent clickhouse-go versions in favor of the context-based `clickhouse.WithAsync()` approach. The method still works and the signature shown is accurate, but readers may eventually need to migrate.
- The `ConnOpenInOrder` strategy will always prefer the first host in `Addr`; for multi-host setups `ConnOpenRoundRobin` or `ConnOpenRandom` may be more appropriate — not an error, just a design consideration.
- `opts.TLS = &tls.Config{InsecureSkipVerify: false}` is effectively a no-op (false is the default); it's harmless but redundant.
- The Gin application hard-codes connection settings while the Fiber application reads them from environment variables — stylistic inconsistency only, not a technical issue.
