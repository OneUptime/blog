# Validation Summary: How to Use Lazy Database Engine in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- Lazy database engine
- Log-family table engines (Log, TinyLog, StripeLog)

## Sources Consulted
- ClickHouse official documentation for the Lazy database engine (https://clickhouse.com/docs/en/engines/database-engines/lazy — now returns 404 since the engine was removed; verified against archived docs)
- ClickHouse GitHub PR #93627 — "Remove `Lazy` database engine" (merged 2026-01-25)
- ClickHouse GitHub PR #96283 — addition of `lazy_load_tables` setting as a replacement (merged 2026-02-19)

## Issues Found

1. **Lazy engine removed from ClickHouse (critical):** The Lazy database engine was removed from ClickHouse entirely in January 2026 (PR #93627), which predates this post (2026-03-31). Added a deprecation notice at the top of the post noting the removal and pointing to the replacement (`lazy_load_tables` setting on the Atomic engine).

2. **Incorrect CREATE DATABASE syntax:** The post used a named parameter syntax `ENGINE = Lazy(expiration_time_seconds = 3600)`, but the Lazy engine takes a positional parameter: `ENGINE = Lazy(3600)`. Fixed to use the correct positional syntax.

## Review Notes
- The replacement for the Lazy engine is the `lazy_load_tables` database setting, which can be used with the Atomic engine and supports all table engines (not just Log-family). This is a strictly more capable replacement.
- All other technical claims in the post (Log-family restriction, expiration behavior, supported table engines, limitations) are accurate for the historical version of the Lazy engine.
- The SQL examples for table creation, insertion, and querying are syntactically correct.
- The `system.tables` query for checking memory usage is valid.
