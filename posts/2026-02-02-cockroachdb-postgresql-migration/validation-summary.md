# Validation Summary: How to Migrate from PostgreSQL to CockroachDB

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- PostgreSQL
- CockroachDB
- pg_dump / psql
- SQL (DDL, DML, indexes, constraints, sequences)
- Python (psycopg2, SQLAlchemy, sqlalchemy_cockroachdb)
- Node.js (pg, TypeORM)
- Debezium (PostgreSQL connector / CDC)
- Apache Kafka + Zookeeper (Confluent images)
- Docker Compose
- PgBouncer
- Prometheus alerting rules
- CockroachDB IMPORT INTO (CSV)
- CockroachDB multi-region / locality features
- crdb_internal tables (monitoring)

## Sources Consulted
- CockroachDB Cluster Settings: https://www.cockroachlabs.com/docs/stable/cluster-settings
- CockroachDB crdb_internal reference: https://www.cockroachlabs.com/docs/stable/crdb-internal
- CockroachDB IMPORT INTO: https://www.cockroachlabs.com/docs/stable/import-into
- CockroachDB Monitor and Analyze Transaction Contention: https://www.cockroachlabs.com/docs/stable/monitor-and-analyze-transaction-contention
- CockroachDB Functions and Operators: https://www.cockroachlabs.com/docs/stable/functions-and-operators
- CockroachDB Multi-Region / SET LOCALITY docs
- psycopg2 errors module (SerializationFailure / SQLSTATE 40001)
- sqlalchemy_cockroachdb package (PyPI / GitHub)
- TypeORM CockroachDB datasource docs
- PostgreSQL `pg_proc.prokind` (PG 11+)
- Debezium PostgreSQL connector documentation
- PgBouncer documentation (transaction pool mode recommended for CockroachDB)

## Issues Found

1. **Incorrect SQL syntax for cluster setting**
   - Original: `SET kv.transaction.max_intents_bytes = 4194304;`
   - `kv.transaction.max_intents_bytes` is a cluster setting, not a session variable. The plain `SET` form would fail.
   - Fixed to: `SET CLUSTER SETTING kv.transaction.max_intents_bytes = 4194304;`

2. **Wrong column names in `crdb_internal.node_statement_statistics` query**
   - Original used `query, calls, total_time, mean_time, rows` — these are PostgreSQL `pg_stat_statements` column names and do not exist in CockroachDB's `node_statement_statistics` view.
   - Fixed to use actual columns: `key, count, service_lat_avg, rows_avg` and ordered by `service_lat_avg DESC`.

3. **Wrong column names in `crdb_internal.transaction_contention_events` query**
   - Original used `key, txn_id, ts, duration` — none of these are actual columns.
   - Fixed to use actual columns: `contending_key, waiting_txn_id, collection_ts, contention_duration` (ordered by `contention_duration DESC`).

4. **`lease_holder` not available in `crdb_internal.ranges_no_leases`**
   - The `ranges_no_leases` view intentionally omits lease information. Selecting `lease_holder` from it would fail.
   - Fixed by switching the query to `crdb_internal.ranges` (which does expose `lease_holder`).

5. **Incorrect JSONB path against `crdb_internal.range_stats(...)`**
   - Original used `crdb_internal.range_stats(start_key)->'stats'`. The function returns a flat JSONB object whose stats fields (e.g. `key_bytes`, `live_bytes`) are at the top level; there is no nested `stats` key, so `->'stats'` would return NULL.
   - Fixed by removing the `->'stats'` indirection.

## Review Notes

- The `IMPORT INTO ... CSV DATA (...) WITH skip, nullif, decompress` syntax remains valid in current CockroachDB versions; PGDUMP/MYSQLDUMP/AVRO formats for `IMPORT INTO` have been removed in newer versions but the CSV path used here is supported.
- The post manually calls `registry.register('cockroachdb', 'sqlalchemy_cockroachdb', 'CockroachDBDialect')`. Modern `sqlalchemy-cockroachdb` registers itself via entry points, so this call is redundant but not incorrect.
- The JavaScript snippet uses `fs.readFileSync(...)` without an explicit `const fs = require('fs')`. This is typical illustrative tutorial code and was left as-is.
- `transfer_funds` example in the Python snippet uses hard-coded literals (`balance - 100`) instead of parameter substitution; this is illustrative and was left as-is.
- CockroachDB Labs increasingly recommends the MOLT toolkit for ongoing PostgreSQL → CockroachDB migrations. The post's approach (CSV + IMPORT INTO, pg_dump + psql, Debezium CDC) is still valid but readers running fresh migrations may want to evaluate MOLT in addition to the techniques shown.
- The compatibility matrix lists "Triggers: No" for CockroachDB. CockroachDB has added limited trigger support in very recent releases (preview-stage); the matrix remains accurate as a conservative guidance for migrators but may need refinement once trigger support stabilizes.
- The `unique_rowid()` function is correct but is a 64-bit signed monotonically-ish increasing value optimized for distributed inserts; UUIDs (as the post recommends) are generally still preferred for better distribution.
