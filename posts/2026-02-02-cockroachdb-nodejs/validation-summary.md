# Validation Summary: How to Use CockroachDB with Node.js

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- CockroachDB (distributed SQL database)
- Node.js
- node-postgres (`pg`) driver
- Sequelize ORM
- Knex query builder
- Express.js
- Docker (for local CockroachDB setup)
- CockroachDB Cloud
- Jest (test framework, implied in test examples)

## Sources Consulted
- CockroachDB docs — UUID type and `gen_random_uuid()`: https://www.cockroachlabs.com/docs/stable/uuid
- CockroachDB docs — pg_catalog compatibility: https://www.cockroachlabs.com/docs/stable/pg-catalog
- CockroachDB docs — crdb_internal tables: https://www.cockroachlabs.com/docs/stable/crdb-internal
- CockroachDB v20.2 release notes (interleaved tables deprecation): https://www.cockroachlabs.com/docs/releases/v20.2
- CockroachDB issue tracker on INTERLEAVE removal: https://github.com/cockroachdb/cockroach/issues/52009
- CockroachDB docs — CREATE INDEX (STORING, partial): https://www.cockroachlabs.com/docs/stable/create-index
- CockroachDB docs — CREATE TABLE (inline INDEX, STRING type): https://www.cockroachlabs.com/docs/stable/create-table
- CockroachDB docs — SELECT FOR UPDATE: https://www.cockroachlabs.com/docs/stable/select-for-update
- CockroachDB docs — Connect to the database: https://www.cockroachlabs.com/docs/stable/connect-to-the-database
- CockroachDB docs — Transaction retry errors and SQLSTATE: https://www.cockroachlabs.com/docs/stable/transaction-retry-error-reference
- CockroachDB docs — Common errors / SQLSTATE codes: https://www.cockroachlabs.com/docs/stable/common-errors

## Issues Found

1. **`cockroachdb://` URL scheme in CockroachDB Cloud connection string example.** The `cockroachdb://` scheme is only used by certain ORM adapters (SQLAlchemy, Active Record) — node-postgres and other Node.js clients expect `postgresql://`. Changed the example to use `postgresql://`.

2. **`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"` in the Knex migration.** CockroachDB does not support the `uuid-ossp` extension, and `gen_random_uuid()` is already built in. The CREATE EXTENSION call would fail. Replaced it with a comment noting that no extension is required.

3. **Misleading "interleaved storage" comment on the `order_items` table.** The SQL never used `INTERLEAVE IN PARENT` syntax (interleaved tables were deprecated in v20.2 and fully removed by v22.1/22.2), so calling the table "interleaved" was incorrect. Reworded the comment to describe what the SQL actually does (composite primary key prefixed by `user_id` for locality).

4. **Incorrect columns on `pg_stat_user_indexes` query.** The view (which is empty in CockroachDB anyway) does not have `table_name` / `index_name` columns — those are PostgreSQL spec columns named `relname` / `indexrelname`. Replaced the query with one against `crdb_internal.index_usage_statistics` joined with `crdb_internal.table_indexes`, which is the supported CockroachDB way to inspect index usage.

5. **`is_live` and `is_available` columns referenced on `crdb_internal.gossip_liveness`.** `gossip_liveness` does not expose those columns — `is_live` lives on `crdb_internal.gossip_nodes`, and there is no `is_available` column on either table. Changed the cluster-health check query to read `is_live` from `crdb_internal.gossip_nodes` and dropped the non-existent `is_available` field.

## Review Notes
- `crdb_internal` tables are explicitly documented by Cockroach Labs as unstable and subject to change without notice. The health-check example uses them anyway, which is acceptable for an internal monitoring helper but consumers should be aware the schema can change between CockroachDB versions.
- The post uses CockroachDB's `STRING` type alias and the `INDEX ... (col)` inline syntax inside `CREATE TABLE`, both of which are valid CockroachDB SQL but diverge from PostgreSQL portability — worth noting if a reader plans to dual-target both engines.
- The Sequelize `dialect: 'postgres'` approach is fine for CockroachDB compatibility; there is also a separate `sequelize-cockroachdb` adapter that some teams prefer for nicer retry handling, but it is not required.
- The example `INTERVAL '1 day' * $1` arithmetic in `deactivateInactiveUsers` is valid in CockroachDB and produces the expected result.
- The post references `crdb_internal.index_usage_statistics` indirectly via the fix; this view was added in CockroachDB v22.x and is the recommended source for index-read telemetry in current versions.
