# Validation Summary: How to Design Schemas for CockroachDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CockroachDB (distributed SQL database)
- SQL / PostgreSQL-compatible syntax
- JSONB columns and indexing (inverted / GIN indexes)
- Hash-sharded indexes
- Multi-region table localities (REGIONAL BY ROW, GLOBAL)
- Computed columns, partial indexes, expression indexes
- PL/pgSQL functions (in original draft)

## Sources Consulted
- CockroachDB Docs — Hash-Sharded Indexes: https://www.cockroachlabs.com/docs/stable/hash-sharded-indexes
- CockroachDB Docs — CREATE INDEX: https://www.cockroachlabs.com/docs/stable/create-index
- CockroachDB Docs — Inverted Indexes (GIN alias): https://www.cockroachlabs.com/docs/stable/inverted-indexes
- CockroachDB Docs — Table Localities: https://www.cockroachlabs.com/docs/stable/table-localities
- CockroachDB Docs — Regional Tables: https://www.cockroachlabs.com/docs/stable/regional-tables
- CockroachDB Docs — Global Tables: https://www.cockroachlabs.com/docs/stable/global-tables
- CockroachDB Docs — PL/pgSQL: https://www.cockroachlabs.com/docs/stable/plpgsql
- CockroachDB Docs — Computed Columns: https://www.cockroachlabs.com/docs/stable/computed-columns
- CockroachDB Docs — Partial Indexes: https://www.cockroachlabs.com/docs/stable/partial-indexes
- CockroachDB Docs — Expression Indexes: https://www.cockroachlabs.com/docs/stable/expression-indexes
- CockroachDB Architecture — Distribution Layer (range size): https://www.cockroachlabs.com/docs/stable/architecture/distribution-layer

## Issues Found

1. **REGIONAL BY ROW with custom region column (line ~308).** The original example declared a custom `region crdb_internal_region` column but used `LOCALITY REGIONAL BY ROW` without the `AS region` clause. Per the table-localities docs, plain `LOCALITY REGIONAL BY ROW` causes CockroachDB to add/use a hidden `crdb_region` column and ignore any user-defined region column. The subsequent `INSERT` and `SELECT` examples (which write to and filter on `region`) would not behave as described.
   - **Fix:** Changed `) LOCALITY REGIONAL BY ROW;` to `) LOCALITY REGIONAL BY ROW AS region;` so the custom column is actually used as the row's region.

2. **PL/pgSQL batched migration function uses unsupported constructs (lines ~517–555).** The original `migrate_orders_batch` function relied on `GET DIAGNOSTICS ... = ROW_COUNT` and `PERFORM pg_sleep(...)`. Per the CockroachDB PL/pgSQL docs, both `GET DIAGNOSTICS` and `PERFORM` are explicitly unsupported, so the function would fail to create / execute.
   - **Fix:** Replaced the PL/pgSQL function with an application-driven batched UPDATE that uses a `WITH batch_rows AS (...)` CTE and `RETURNING` clause. Added a short paragraph noting that driving the loop from the application gives cleaner control over batch size, throttling, retries, and progress logging. This is the idiomatic CockroachDB pattern for batched migrations and avoids the unsupported PL/pgSQL features.

## Review Notes

- **`CREATE INDEX CONCURRENTLY`** (line ~484) is accepted by CockroachDB as a no-op for PostgreSQL compatibility — all CockroachDB index creation is already online. The example is not incorrect, but the `CONCURRENTLY` keyword is unnecessary; the post's surrounding text correctly emphasises that index creation is online and non-blocking.
- **`USING GIN(...)` syntax for JSONB** (line ~381) is valid in current CockroachDB as an alias for `CREATE INVERTED INDEX`.
- **Default range size of 512 MiB** is correct (default since v20.1; the post says "512MB" which is close enough for prose).
- **PL/pgSQL availability** in general was added in CockroachDB v24.x. If the post is read against older clusters, the PL/pgSQL feature itself may not be available, but with the rewrite the example is now plain SQL and works on any supported version.
- No other technical issues found. Hash-sharded index syntax, partial indexes, expression indexes, computed columns (`AS (expr) STORED`), `LOCALITY GLOBAL`, enum types, PREPARE/EXECUTE/DEALLOCATE, and `gen_random_uuid()` are all valid in current CockroachDB.
