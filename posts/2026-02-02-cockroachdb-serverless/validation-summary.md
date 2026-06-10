# Validation Summary: How to Use CockroachDB Serverless

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CockroachDB Serverless (CockroachDB Cloud Basic tier)
- PostgreSQL wire protocol compatibility
- Node.js `pg` driver and connection pooling
- Python `psycopg2` (with `ThreadedConnectionPool`)
- Go `pgx/v5` (`pgxpool`)
- SQL (DDL, DML, transactions, indexing, multi-region table localities)
- CockroachDB internal tables (`crdb_internal.cluster_sessions`, `ranges_no_leases`, `transaction_contention_events`)
- OpenTelemetry tracing for database operations
- CockroachDB time-travel (`AS OF SYSTEM TIME`)
- Row-Level Security
- Mermaid diagrams

## Sources Consulted
- CockroachDB official docs — full-text search: https://www.cockroachlabs.com/docs/stable/full-text-search
- CockroachDB official docs — `crdb_internal` tables: https://www.cockroachlabs.com/docs/stable/crdb-internal
- CockroachDB official docs — Row-Level Security: https://www.cockroachlabs.com/docs/stable/row-level-security
- CockroachDB v25.2 release notes (RLS GA): https://www.cockroachlabs.com/docs/releases/v25.2
- CockroachDB Cloud Serverless plan docs: https://www.cockroachlabs.com/docs/cockroachcloud/plan-your-cluster-serverless
- CockroachDB multi-region overview: https://www.cockroachlabs.com/docs/stable/multiregion-overview
- CockroachDB `SHOW RANGES`: https://www.cockroachlabs.com/docs/stable/show-ranges
- CockroachDB performance recipes (contention queries): https://www.cockroachlabs.com/docs/stable/performance-recipes
- pgx v5 documentation (pgxpool API)
- psycopg2 documentation (`psycopg2.pool.ThreadedConnectionPool`, `psycopg2.errors.SerializationFailure`)

## Issues Found

1. **Incorrect column names in `crdb_internal.transaction_contention_events` query** (Monitoring section).
   - Was: `SELECT key, txn_id, ts, duration FROM crdb_internal.transaction_contention_events WHERE duration > interval '100ms' ORDER BY duration DESC`.
   - Fixed to use the actual column names: `contending_key`, `blocking_txn_id`, `waiting_txn_id`, `collection_ts`, `contention_duration`. The original column names do not exist in this table, so the query would fail.

2. **Misleading comment about full-text search syntax** (Migration from PostgreSQL section).
   - Was: `-- CockroachDB uses full_text_search instead of to_tsvector` — this is incorrect. CockroachDB supports the PostgreSQL `to_tsvector`/`tsvector`/`tsquery`/`@@` syntax directly (added in v23.1). The code immediately below already used `to_tsvector` correctly, so the comment contradicted the code.
   - Fixed comment to accurately describe CockroachDB's PostgreSQL-compatible full-text search support.

## Review Notes

- **Row-Level Security syntax**: The `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and `CREATE POLICY` examples are valid in CockroachDB v25.2+ (RLS reached GA in v25.2, May 2025). For the publication date (2026-02), this is current and supported.
- **Connection string hostname format**: The example uses the legacy `free-tier.gcp-us-central1.cockroachlabs.cloud` hostname. Newer CockroachDB Cloud Serverless clusters use a cluster-specific hostname like `<cluster-name>-<id>.<region>.cockroachlabs.cloud`. Left unchanged as it is shown as a generic example, but readers should note their actual hostname will differ.
- **Free tier specifications** ("10 GiB of storage and 50M Request Units per month"): These were the historical CockroachDB Serverless free-tier limits. The plan has evolved over time (now branded as CockroachDB Cloud Basic with a $15/month resource grant model in some regions). Current readers should verify limits on the pricing page.
- **Multi-region on Serverless/Basic**: The post's claim that "CockroachDB Serverless supports multi-region configurations" is accurate — multi-region is available on the Basic tier. A subtlety not mentioned: on Basic clusters, databases automatically inherit cluster regions, so the `ALTER DATABASE ... ADD REGION` calls may be unnecessary in practice.
- **`crdb_internal.ranges_no_leases` schema**: The `range_size_mb` column exists alongside `range_size` in the parallel `ranges` view; the join to `crdb_internal.tables` on `table_id` is reasonable, though the column set may vary across CockroachDB versions.
- **`current` used as a table alias** in the time-travel JOIN example is unusual (it is a reserved word in standard SQL) but works in CockroachDB. Left as-is to preserve the author's example.
- **`SET app.current_tenant = ...` for RLS**: CockroachDB does support session-level custom variables in recent versions for use with `current_setting()`. This pattern works on supported versions but readers on older versions may need an alternative approach.
