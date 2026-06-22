# Validation Summary: How to Install and Configure CockroachDB on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CockroachDB (v23.2.0)
- Ubuntu (20.04+)
- systemd
- SQL (CockroachDB dialect, PostgreSQL-compatible)
- PostgreSQL client (psql)
- TLS/certificate-based authentication

## Sources Consulted
- CockroachDB official docs — Install CockroachDB on Linux (https://www.cockroachlabs.com/docs/v23.2/install-cockroachdb-linux)
- CockroachDB `cockroach start` / `start-single-node` reference (https://www.cockroachlabs.com/docs/v23.2/cockroach-start)
- CockroachDB `cockroach cert` reference (https://www.cockroachlabs.com/docs/v23.2/cockroach-cert)
- CockroachDB Deploy on a single machine / systemd guidance (https://www.cockroachlabs.com/docs/v23.2/start-a-local-cluster)
- CockroachDB SQL statement reference: CREATE TABLE, CREATE INDEX, BACKUP, RESTORE, CREATE SCHEDULE, ALTER ... CONFIGURE ZONE (https://www.cockroachlabs.com/docs/v23.2/sql-statements)
- CockroachDB Cluster Settings reference, incl. `server.time_until_store_dead` (https://www.cockroachlabs.com/docs/v23.2/cluster-settings)
- CockroachDB Multi-region / LOCALITY REGIONAL BY ROW docs (https://www.cockroachlabs.com/docs/v23.2/multiregion-overview)

## Issues Found
1. **Incorrect comment on `server.time_until_store_dead`** — The SQL snippet under "Cluster Settings" labeled `SET CLUSTER SETTING server.time_until_store_dead = '5m';` with the comment `-- Set timezone`. This setting has nothing to do with timezones; it controls how long an unresponsive store is allowed to remain before being considered dead and its ranges re-replicated. Changed the comment to `-- Time before an unresponsive store is considered dead` to accurately describe the setting.

## Review Notes
- **Binary install, systemd unit, and certificate workflow are correct.** The download URL format (`https://binaries.cockroachdb.com/cockroach-v23.2.0.linux-amd64.tgz`), copying the `lib/` geo libraries to `/usr/local/lib/cockroach`, `Type=notify` for the systemd service, `--cache`/`--max-sql-memory` fractions, and the `cockroach cert create-ca/create-node/create-client` sequence all match the official v23.2 documentation.
- **SQL examples are valid CockroachDB dialect:** `gen_random_uuid()`, `STRING`, `DECIMAL`, inline `INDEX`, `UPSERT`, savepoints, `CREATE INVERTED INDEX`, `STORING` covering indexes, `LOCALITY REGIONAL BY ROW AS region`, and the `crdb_internal` introspection tables (`gossip_nodes`, `ranges_no_leases`, `table_statistics`, `node_statement_statistics`) are all real and correctly used.
- **`BACKUP ... TO` / `RESTORE ... FROM '<location>'` (non-collection) syntax is deprecated.** Starting in v22.1, CockroachLabs recommends the collection-based `BACKUP ... INTO` and `RESTORE ... FROM LATEST IN '<collectionURI>'` forms. The legacy `TO`/`FROM` syntax shown still functions in v23.2, so the examples are not broken, but they will eventually be removed. A future update could migrate these examples to the `INTO` syntax. Left unchanged to avoid restructuring the post.
- The `CREATE INVERTED INDEX idx_user_tags ON users(tags)` example references a `tags` column not defined on the earlier `users` table; it is illustrative only and clearly serves as a syntax demonstration.
- In a secure cluster, the `root` user authenticates via client certificate rather than password; the `psql` SSL example with `sslrootcert` would additionally require client cert/key for `root`. This is a minor caveat, not an error, and is acceptable as a generic connection-string illustration.
