# Validation Summary: How to Set Up PostgreSQL with PgBouncer Connection Pooling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- PgBouncer
- PgBouncer authentication and pooling modes
- TLS configuration
- HAProxy TCP load balancing
- Prometheus pgbouncer_exporter
- psycopg2

## Sources Consulted
- PgBouncer configuration documentation: https://www.pgbouncer.org/config.html
- PgBouncer command-line usage and admin console documentation: https://www.pgbouncer.org/usage.html
- PgBouncer installation documentation: https://www.pgbouncer.org/install.html
- PgBouncer downloads page: https://www.pgbouncer.org/downloads/
- PostgreSQL pg_authid documentation: https://www.postgresql.org/docs/current/catalog-pg-authid.html
- PostgreSQL pg_shadow documentation: https://www.postgresql.org/docs/current/view-pg-shadow.html
- PostgreSQL password authentication documentation: https://www.postgresql.org/docs/current/auth-password.html
- PostgreSQL PREPARE / EXECUTE / DEALLOCATE documentation: https://www.postgresql.org/docs/current/sql-prepare.html
- prometheus-community pgbouncer_exporter README: https://github.com/prometheus-community/pgbouncer_exporter
- PostgreSQL PGDG APT repository documentation: https://wiki.postgresql.org/wiki/Apt
- PostgreSQL PGDG YUM repository: https://yum.postgresql.org/

## Issues Found
- The source install example used PgBouncer 1.22.0, while the current PgBouncer source release is 1.25.2. Updated the download URL, tarball name, and directory.
- The SCRAM examples used lowercase `scram-sha-256` secret text and mixed MD5 hashes with `auth_type = scram-sha-256`. Updated the userlist examples to use PostgreSQL's `SCRAM-SHA-256$...` secret format and clarified that MD5 hashes apply to `auth_type = md5`.
- The SCRAM generation note said PostgreSQL 14+, but SCRAM-SHA-256 password authentication has existed since PostgreSQL 10. Updated the version note and added the catalog-access caveat for reading `pg_authid`.
- The recommended `auth_query` used direct `pg_shadow` access and granted SELECT on it. Replaced it with PgBouncer's recommended pattern: a non-superuser `auth_user`, an `auth_file` entry for that user, and a `SECURITY DEFINER` lookup function over `pg_authid`.
- The production configuration used the same unsafe direct `pg_shadow` query and omitted the required `auth_file` for `auth_user` credentials. Updated it to match the corrected authentication pattern.
- The production configuration included `sbuf_lookahead`, which is not a current PgBouncer setting. Replaced it with the documented `sbuf_loopcnt`.
- The `SHOW STATS` column list used older names such as `total_requests` and `avg_req`. Updated it to current PgBouncer statistic column names.
- The pgbouncer_exporter download and metrics were outdated. Updated the release example to v0.12.0 and changed metric names to the current exporter names such as `pgbouncer_pools_client_waiting_connections`.
- The Prometheus alert expressions referenced outdated metric names and an outdated server-used metric. Updated them to current pgbouncer_exporter metric names.
- The troubleshooting auth-query example used `pg_shadow`. Updated it to call the corrected `pgbouncer.user_lookup()` function.
- The pool-exhaustion temporary fix used `SET reserve_pool_size = 10;` followed by `RELOAD;`, which can revert the runtime change from the file. Removed `RELOAD;` from that temporary admin-console example.
- The configuration validation command used `pgbouncer -d ... --help`, which shows help rather than validating the file. Replaced it with a foreground verbose start command that surfaces parse errors.
- The psycopg2 example passed `options="-c statement_timeout=30000"`, which can be rejected by PgBouncer unless startup parameters are explicitly handled. Removed the option from the example.
- The prepared-statement guidance said prepared statements simply needed workarounds and suggested disabling prepared statement tracking with `ignore_startup_parameters`. Updated the section to describe PgBouncer 1.21+ protocol-level prepared statement tracking via `max_prepared_statements` and to clarify that SQL-level `PREPARE`/`EXECUTE`/`DEALLOCATE` commands are not tracked.

## Review Notes
- The guide is technically relevant and remains a valid PgBouncer setup tutorial after the corrections.
- The pool sizing formulas are reasonable as starting heuristics, but real production sizing should still be based on workload testing, PostgreSQL `max_connections`, query latency, CPU, and storage behavior.
- The multi-host read replica example is syntactically valid for PgBouncer, but operators should remember PgBouncer's host lists are not a full failover manager; unavailable hosts can still affect connection attempts.
