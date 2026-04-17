# Validation Summary: How to Build a Custom Data Ingestion Service for ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (native TCP protocol on port 9000)
- Go (stdlib: `net/http`, `sync`, `encoding/json`, `context`, `time`, `log`)
- `github.com/ClickHouse/clickhouse-go/v2` (official ClickHouse Go driver)
- LZ4 compression
- curl (test client)

## Sources Consulted
- ClickHouse Go driver (v2) repository and docs: https://github.com/ClickHouse/clickhouse-go
- ClickHouse Go v2 `Options` struct (Addr, Auth, Compression, MaxOpenConns, MaxIdleConns)
- ClickHouse Go v2 batch API: `PrepareBatch`, `AppendStruct`, `Send`
- ClickHouse native protocol port reference (9000 for native TCP)

## Issues Found
No technical issues found.

Specifically verified:
- `clickhouse.Open(&clickhouse.Options{...})` signature is correct for v2.
- `Addr`, `Auth` (with `Database`/`Username`/`Password`), `Compression` (with `Method: clickhouse.CompressionLZ4`), and `MaxOpenConns` are all valid fields on `clickhouse.Options` in v2.
- `conn.PrepareBatch(ctx, "INSERT INTO events")` is the documented way to start a batch.
- `b.AppendStruct(&e)` and `b.Send()` are valid methods on the batch returned by `PrepareBatch`.
- The native port `9000` matches ClickHouse's default TCP protocol port.
- The Go code is syntactically valid; imports match usage.
- The curl command is well-formed and the JSON payload matches the declared `Event` struct tags (`ts`, `type`, `user_id`, `data`).

## Review Notes
- The `ingestHandler` function takes a `clickhouse.Conn` parameter but does not use it. This is not an error (it may be kept for future use or symmetry with `flusher`), but a reader could find it confusing.
- The snippet omits `main()` and the HTTP mux/server setup (`http.ListenAndServe(":8080", ...)` and registration of `/ingest`). The curl example references port 8080 and path `/ingest`, which is consistent with the implied setup but not explicit in code.
- The `flush` function silently ignores errors from `AppendStruct` via `_ =`; in production, those should be logged or surfaced. The summary paragraph already suggests adding retry logic with exponential backoff, so this is a known simplification.
- For `AppendStruct` column mapping, field names on the `Event` struct are used unless a `ch:"..."` tag is provided. The post assumes an `events` table with matching columns; that assumption is fine for a tutorial.
- In Go versions older than 1.22, the loop variable `e` in `for _, e := range rows { _ = b.AppendStruct(&e) }` would share the same address across iterations. Because `AppendStruct` consumes the value synchronously within the iteration, this is safe in practice on both old and new Go versions — no change needed.
- Non-version-specific caveat: a single global mutex-protected slice is fine for a tutorial but will become a hotspot under high concurrency; a channel-fed worker or sharded buffers would scale better. Outside scope of a correctness review.
