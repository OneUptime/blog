# Validation Summary: How to Handle ClickHouse Errors and Retries in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- Go (Golang)
- `github.com/ClickHouse/clickhouse-go/v2` driver
- Error handling / `errors.As`
- Exponential backoff with jitter
- Go `context` cancellation

## Sources Consulted
- ClickHouse `ErrorCodes.cpp` (authoritative source of error code numbers): https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ErrorCodes.cpp
- `clickhouse-go` v2 package docs: https://pkg.go.dev/github.com/ClickHouse/clickhouse-go/v2
- `clickhouse-go` repository: https://github.com/ClickHouse/clickhouse-go

## Issues Found
1. **Error code 159 mislabeled as "Too many parts"** — Code 159 is actually `TIMEOUT_EXCEEDED`. The correct code for "Too many parts" is **252** (`TOO_MANY_PARTS`). Fixed in the error table, the `retriableCodes` map, the "Handling Too Many Parts" section heading, and the body of that section.
2. **Error code 285 mislabeled as "Too many simultaneous queries"** — Code 285 is actually `TOO_FEW_LIVE_REPLICAS`. The correct code for "Too many simultaneous queries" is **202** (`TOO_MANY_SIMULTANEOUS_QUERIES`). Fixed in the error table and the `retriableCodes` map.
3. **Minor: Code 210 description** — Code 210 is `NETWORK_ERROR` (a generic network error), not specifically "connection refused". Updated the map comment to say "network error" for accuracy.

## Review Notes
- The `*clickhouse.Exception` type and its `Code int32` field are correct for `github.com/ClickHouse/clickhouse-go/v2` (it re-exports `proto.Exception`).
- The code examples use several implicit imports (`errors`, `fmt`, `log`, `math`, `net`, `math/rand`, `context`) without showing them in every snippet. This is typical for blog snippets and is acceptable.
- `rand.Int63n(int64(delay / 4))` will panic if `delay < 4ns`; in practice `BaseDelay` is 500ms so this is not a real-world concern, but readers adopting very low base delays should be aware.
- `math/rand` (global `rand.Int63n`) is fine here, but in Go 1.20+ the global source is seeded automatically; pre-1.20 code would need `rand.Seed`. Not worth calling out in the post.
- The "Context-Aware Retry" snippet is shown as a standalone `select` rather than integrated into `WithRetry`; readers will need to combine them. This is a stylistic choice and not a technical error.
