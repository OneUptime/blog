# Validation Summary: How to Use Connection Pooling with PgBouncer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- PgBouncer
- Connection pooling
- PgBouncer configuration
- psql
- psycopg2
- node-postgres
- HAProxy
- Prometheus PgBouncer exporter
- Docker

## Sources Consulted
- PgBouncer configuration documentation: https://www.pgbouncer.org/config.html
- PgBouncer usage and admin console documentation: https://www.pgbouncer.org/usage.html
- node-postgres query and prepared statement documentation: https://node-postgres.com/features/queries
- Psycopg prepared statement documentation: https://www.psycopg.org/psycopg3/docs/advanced/prepare.html
- PostgreSQL PREPARE documentation: https://www.postgresql.org/docs/current/sql-prepare.html
- Prometheus PgBouncer exporter documentation: https://github.com/prometheus-community/pgbouncer_exporter
- edoburu PgBouncer Docker image documentation: https://hub.docker.com/r/edoburu/pgbouncer/

## Issues Found
- The PgBouncer admin console examples used a `pgbouncer` user without configuring `admin_users` or `stats_users`. Added `admin_users = admin`, `stats_users = pgbouncer`, and a matching monitoring user in `userlist.txt`.
- The admin console connection example used the stats/monitoring user for admin commands. Changed it to connect as `admin`.
- The PgBouncer exporter connection string omitted the monitoring password even though the sample uses password authentication. Added the password to the DSN.
- The custom monitoring queries used invalid SQL such as `SELECT * FROM SHOW POOLS`. PgBouncer admin console supports PgBouncer `SHOW` commands, not those commands as SQL subqueries. Replaced the examples with valid `SHOW POOLS;` commands.
- The prepared statement guidance incorrectly used timeout settings as if they disabled prepared statements. Updated the section to distinguish SQL-level prepared statements from protocol-level named prepared statements, and corrected the psycopg2 and node-postgres examples.
- The `[users]` example used `default = pool_mode=transaction`, which PgBouncer treats as a literal user name rather than a default. Replaced it with global `pool_mode = transaction` and a user-specific `legacy_app` override.
- The multi-host database example described failover behavior without configuring PgBouncer's multi-host selection behavior. Added `load_balance_hosts=disable` to match a fallback-after-failure setup.
- The statement pooling caveat said all prepared statements are unsupported. Updated it to specify SQL-level prepared statements, matching current PgBouncer support for protocol-level named prepared statements when enabled.

## Review Notes
The post is technically relevant and generally accurate after the corrections above. Future improvements could mention that PgBouncer's prepared-statement behavior depends on version and `max_prepared_statements`, and that production authentication commonly uses SCRAM rather than MD5 where supported.
