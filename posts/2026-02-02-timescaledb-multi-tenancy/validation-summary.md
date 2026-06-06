# Validation Summary: How to Handle Multi-Tenancy in TimescaleDB

## Status
validated

## Post Type
Tutorial / Architectural guide

## Technologies Covered
- TimescaleDB (hypertables, continuous aggregates, compression policies, retention policies, space partitioning)
- PostgreSQL (row-level security, schemas, template databases, procedures vs functions, GIN indexes)
- TimescaleDB Toolkit (`percentile_agg`, `approx_percentile`)
- `btree_gin` extension
- Python `psycopg2` (ThreadedConnectionPool)
- PgBouncer (transaction-level pooling)

## Sources Consulted
- TimescaleDB continuous aggregates documentation and known limitations (ordered-set aggregates not supported): https://docs.timescale.com/use-timescale/latest/continuous-aggregates/
- TimescaleDB Toolkit percentile approximation: https://docs.timescale.com/api/latest/hyperfunctions/percentile-approximation/percentile-aggregation-methods/
- TimescaleDB `add_dimension` / hypertable APIs: https://docs.timescale.com/api/latest/hypertable/add_dimension/
- TimescaleDB `set_chunk_time_interval`: https://docs.timescale.com/api/latest/hypertable/set_chunk_time_interval/
- TimescaleDB `timescaledb_information.chunks` view: https://docs.timescale.com/api/latest/informational-views/chunks/
- PostgreSQL `btree_gin` extension: https://www.postgresql.org/docs/current/btree-gin.html
- PostgreSQL PL/pgSQL transaction management (COMMIT in procedures only): https://www.postgresql.org/docs/current/plpgsql-transactions.html
- PostgreSQL row-level security: https://www.postgresql.org/docs/current/ddl-rowsecurity.html

## Issues Found

1. **Missing `##` heading marker** — The "Resource Quotas and Fair Usage" heading was rendered as a paragraph because the `##` Markdown prefix was missing. Added the marker so it renders as a proper section heading.

2. **`PERCENTILE_CONT` in a continuous aggregate would fail** — Ordered-set aggregates (`PERCENTILE_CONT`, `PERCENTILE_DISC`, `MEDIAN`) cannot be used in TimescaleDB continuous aggregates because they have no partial/combine function and aren't parallelizable. Replaced with `percentile_agg(value)` from `timescaledb_toolkit` in the materialized view definition, and `approx_percentile(0.95, value_percentile_agg)` in the dashboard query. Added `CREATE EXTENSION IF NOT EXISTS timescaledb_toolkit;` plus a short comment explaining the substitution.

3. **`COMMIT` inside `CREATE FUNCTION offboard_tenant`** — Transaction control statements (`COMMIT`/`ROLLBACK`) are only allowed inside PROCEDURES invoked via `CALL`, not in FUNCTIONS — calling the original would fail at runtime with "invalid transaction termination." Converted the definition from `CREATE OR REPLACE FUNCTION ... RETURNS VOID AS $$ ... $$ LANGUAGE plpgsql;` to `CREATE OR REPLACE PROCEDURE ... LANGUAGE plpgsql AS $$ ... $$;` and added a comment showing the `CALL` invocation form.

4. **`get_tenant_storage_bytes` overwrote totals instead of accumulating** — The loop body used `INTO v_total_bytes`, which clobbered the running total on every iteration so the function returned only the last chunk's bytes (or zero). Added a separate `v_chunk_bytes` variable and accumulated `v_total_bytes := v_total_bytes + COALESCE(v_chunk_bytes, 0);`.

5. **GIN index on `(tenant_id, tags)` requires the `btree_gin` extension** — UUID has no default operator class for GIN; combining it with JSONB in a multicolumn GIN index needs `btree_gin`. Added `CREATE EXTENSION IF NOT EXISTS btree_gin;` immediately before the index creation, plus a one-line comment.

## Review Notes
- The `add_dimension('metrics', 'tenant_id', number_partitions => 16)` form is deprecated as of TimescaleDB 2.13 (Oct 2023) in favor of the dimension builder `add_dimension('metrics', by_hash('tenant_id', 16))`. The old form still functions, so I left it as-is — but readers on newer installations should prefer the builder syntax.
- Likewise, `create_hypertable('metrics', 'time', chunk_time_interval => INTERVAL '1 day')` is the legacy positional form; the recommended modern form is `create_hypertable('metrics', by_range('time', INTERVAL '1 day'))`. Both still work.
- `set_chunk_time_interval` only affects **future** chunks — existing chunks retain their original interval. The post doesn't call this out, but it's a meaningful caveat when migrating chunk sizing on an existing hypertable.
- The Python example uses `dict[str, ...]` PEP-585 syntax, which requires Python 3.9+. Fine for modern code but worth noting.
- The TimescaleDB extension can be installed in a template database (`CREATE EXTENSION timescaledb` then `datistemplate = TRUE`), and copies inherit it via `CREATE DATABASE ... TEMPLATE`. The post's flow works, though some hosted/Forge environments don't allow user-created templates.
- The `add_dimension` space-partitioning advice ("match expected concurrent tenant queries") is a reasonable heuristic, though TimescaleDB now generally recommends against space partitioning unless you have multi-disk tablespaces or known hot-tenant skew — modern hardware and chunk exclusion usually suffice. Not changed, as the advice isn't wrong, just dated guidance.
