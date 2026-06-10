# Validation Summary: How to Handle Multi-Region Deployments in CockroachDB

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- CockroachDB (multi-region SQL features, survival goals, table localities, follower reads)
- SQL (CockroachDB dialect — DDL, DML, system tables in `crdb_internal`)
- Bash (cockroach CLI: `cockroach start` with `--locality`, `--join`, `--advertise-addr`, `--store`)
- Prometheus (scrape config + alerting rules using `histogram_quantile`, `rate`, `up`)
- HAProxy (TCP load balancing config)
- Node.js (`pg` Pool client)
- Cloud storage backups (S3 URI with `AUTH=implicit`)

## Sources Consulted
- CockroachDB CREATE INDEX docs: https://www.cockroachlabs.com/docs/stable/create-index
- CockroachDB ALTER DATABASE docs: https://www.cockroachlabs.com/docs/stable/alter-database
- CockroachDB Regional Tables / Table Localities: https://www.cockroachlabs.com/docs/stable/regional-tables and https://www.cockroachlabs.com/docs/stable/table-localities
- CockroachDB `crdb_internal` reference: https://www.cockroachlabs.com/docs/stable/crdb-internal
- CockroachDB Hot Ranges Page: https://www.cockroachlabs.com/docs/stable/ui-hot-ranges-page
- CockroachDB multi-region overview, survival goals, follower reads (`follower_read_timestamp()`, `with_max_staleness()`), `default_transaction_use_follower_reads` session variable
- CockroachDB `cockroach start` CLI flag reference
- CockroachDB backup/restore (`CREATE SCHEDULE FOR BACKUP`, `RESTORE ... FROM LATEST IN ... AS OF SYSTEM TIME`)
- CockroachDB zone configuration (`ALTER RANGE default CONFIGURE ZONE USING constraints`, `lease_preferences`)

## Issues Found

1. **Invalid `ALTER DATABASE ... PRIMARY REGION` syntax (no `SET`).**
   The post used `ALTER DATABASE myapp PRIMARY REGION "us-east"`. The supported form per CockroachDB docs is `ALTER DATABASE myapp SET PRIMARY REGION "us-east"`. Added the `SET` keyword.

2. **`LOCALITY REGIONAL BY ROW` would not use the user-defined `region` column.**
   The CREATE TABLE example defined a `region crdb_internal_region` column and then declared `LOCALITY REGIONAL BY ROW`. Without an `AS column_name` clause, CockroachDB creates/uses a hidden `crdb_region` column — the user-defined `region` column would just be regular data, and the follow-up `INSERT ... (region) VALUES (..., 'eu-west')` would have no effect on row locality. Fixed by changing the clause to `LOCALITY REGIONAL BY ROW AS region`, which is the documented way to use a custom column. Also updated the inline comment that referenced the hidden `crdb_region` column.

3. **`crdb_internal.gossip_nodes.last_up_at` does not exist.**
   The "Monitor replication lag" example queried a non-existent column. `crdb_internal.gossip_nodes` exposes columns like `node_id`, `locality`, `is_live`, `started_at`, `ranges`, `leases`, etc., but not `last_up_at`. Heartbeat/liveness info lives in `crdb_internal.gossip_liveness` (with `updated_at`, `epoch`, `draining`, `membership`). Rewrote the query to join `gossip_nodes` with `gossip_liveness` and surface `is_live` plus `updated_at` as the last heartbeat — a valid query that conveys the same operational intent. Updated the heading comment accordingly (the original query did not actually measure replication lag).

4. **`CREATE INDEX CONCURRENTLY` is not part of CockroachDB's CREATE INDEX syntax.**
   PostgreSQL-style `CONCURRENTLY` is not a documented keyword in CockroachDB's CREATE INDEX grammar — CockroachDB schema changes are online by default, so the keyword is unnecessary even where it might be tolerated. Removed `CONCURRENTLY` and updated the comment to note that schema changes are non-blocking by default.

## Review Notes

- The follower-read examples (`follower_read_timestamp()`, `with_max_staleness('10s')`, and the `default_transaction_use_follower_reads` session variable) are correct and current.
- The `crdb_internal.ranges` query using `range_id`, `start_pretty`, `end_pretty`, and `qps` is correct — this is the documented pattern for finding hot ranges.
- The `cockroach start` CLI flags (`--insecure`, `--advertise-addr`, `--join`, `--locality=region=...,zone=...`, `--store=path=...`) are all valid.
- The Prometheus scrape config (`/_status/vars` metrics endpoint, port 8080) and the alerting rule shape (PromQL using `histogram_quantile`, `rate`, `up`, `count by`) are syntactically valid. Note: the `replication_lag_seconds` and `sql_service_latency_bucket` series names are illustrative — real CockroachDB metric names differ slightly (e.g., the actual SQL service latency histogram is `sql_service_latency_bucket`, which matches; `replication_lag_seconds` is not a default CockroachDB metric — operators typically derive replication health from `ranges_underreplicated`, `replicas_leaders_not_leaseholders`, or follower-read timestamp lag). Left as-is since alerting expressions are presented as a template for the reader to adapt.
- `ALTER RANGE default CONFIGURE ZONE USING constraints = '{...}' , lease_preferences = '[[...]]'` is valid syntax. The comment "Simulate region failure by draining nodes" is slightly misleading since the statement itself reconfigures placement rather than draining, but this is a wording nit, not a technical error.
- The Node.js `pg` Pool example and HAProxy config are correct.
- `CREATE SCHEDULE ... FOR BACKUP INTO ... WITH revision_history RECURRING ... FULL BACKUP ...` and the `RESTORE DATABASE ... FROM LATEST IN ... AS OF SYSTEM TIME ...` syntax are correct (Enterprise-licensed features).
- Default ports 26257 (SQL) and 8080 (HTTP/admin) are accurate.
- The post uses the modern multi-region SQL syntax (PRIMARY REGION / ADD REGION / SURVIVE / LOCALITY ...) rather than the older raw zone-config approach, which is the current recommended practice.
