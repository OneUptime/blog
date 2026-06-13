# Validation Summary: How to Handle 10K Connections with PgBouncer

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- PostgreSQL
- PgBouncer
- SCRAM-SHA-256 authentication
- HAProxy TCP load balancing
- Prometheus and pgbouncer_exporter
- Linux sysctl and systemd service limits
- Python psycopg2

## Sources Consulted
- PgBouncer configuration documentation: https://www.pgbouncer.org/config.html
- PgBouncer usage and admin console documentation: https://www.pgbouncer.org/usage.html
- PgBouncer installation documentation: https://www.pgbouncer.org/install.html
- PgBouncer downloads page: https://www.pgbouncer.org/downloads/
- PgBouncer 1.21.0 release note: https://www.pgbouncer.org/2023/10/pgbouncer-1-21-0
- PgBouncer FAQ: https://www.pgbouncer.org/faq.html
- PostgreSQL connection establishment documentation: https://www.postgresql.org/docs/current/connect-estab.html
- PostgreSQL kernel resources documentation: https://www.postgresql.org/docs/current/kernel-resources.html
- Prometheus Community pgbouncer_exporter README and source: https://github.com/prometheus-community/pgbouncer_exporter

## Issues Found
- The SCRAM example used a lowercase prefix and the Python generator produced only a PBKDF2-derived key, not PostgreSQL's `SCRAM-SHA-256$<iterations>:<salt>$<storedkey>:<serverkey>` secret format. Updated the example and Python code to compute `StoredKey` and `ServerKey` using the SCRAM algorithm.
- The post implied that any generated SCRAM secret could be used for PgBouncer server-side login. Added the PgBouncer caveat that backend SCRAM authentication requires either plaintext or the exact SCRAM secret stored in PostgreSQL.
- The pooling mode comparison said prepared statements are unsupported in transaction and statement pooling. Updated it for PgBouncer 1.21+ protocol-level named prepared statement tracking via `max_prepared_statements`, while preserving the limitation for SQL-level `PREPARE`/`EXECUTE`.
- The high-performance configuration implied `server_reset_query` applies to transaction pooling. Added a note that PgBouncer only uses it in session pooling by default.
- The Prometheus alert examples used metric names that do not match Prometheus Community pgbouncer_exporter and referenced a nonexistent `pgbouncer_pools_server_max` metric. Updated the alert expressions to use `pgbouncer_pools_client_waiting_connections`.
- The Docker exporter example used `DATABASE_URL`, but the Prometheus Community exporter uses `PGBOUNCER_EXPORTER_CONNECTION_STRING` or `--pgBouncer.connectionString`. Updated the environment variable.
- The exporter setup omitted PgBouncer's required startup parameter exception for common PostgreSQL drivers. Added `ignore_startup_parameters = extra_float_digits` to the PgBouncer examples.
- The temporary admin-console tuning example used `SET reserve_pool_size = 20;` followed by `RELOAD;`, which can overwrite runtime changes from the config file. Removed `RELOAD` from the temporary fix.
- The troubleshooting note for prepared statements used a generic `prepare_threshold` connection parameter. Replaced it with the documented PgJDBC `prepareThreshold=0` example and added `max_prepared_statements` as the PgBouncer 1.21+ fix.
- Clarified that `DISCARD ALL` reset-query tuning applies to session pooling.

## Review Notes
The guide is technically relevant and broadly accurate after the fixes. The exact memory overhead per PostgreSQL connection remains workload- and build-dependent; the post presents it as an approximate sizing heuristic rather than a guaranteed constant.
