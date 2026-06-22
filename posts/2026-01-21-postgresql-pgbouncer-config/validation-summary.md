# Validation Summary: How to Configure PgBouncer for PostgreSQL

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- PostgreSQL
- PgBouncer
- Connection pooling
- PgBouncer authentication
- PgBouncer admin console and monitoring
- TLS configuration
- HAProxy load balancing

## Sources Consulted
- PgBouncer official configuration documentation: https://www.pgbouncer.org/config.html
- PgBouncer official usage and admin console documentation: https://www.pgbouncer.org/usage.html
- PgBouncer official feature map for pooling modes: https://www.pgbouncer.org/features.html
- PgBouncer official installation documentation: https://www.pgbouncer.org/install.html
- PostgreSQL official password authentication documentation: https://www.postgresql.org/docs/current/auth-password.html
- PostgreSQL official pg_authid catalog documentation: https://www.postgresql.org/docs/current/catalog-pg-authid.html
- PostgreSQL official pg_shadow view documentation: https://www.postgresql.org/docs/current/view-pg-shadow.html

## Issues Found
- The basic configuration listed `admin_users = postgres`, but the examples used `admin` to connect to the PgBouncer admin console and the `userlist.txt` snippet did not include `postgres`. Changed `admin_users` to `admin`.
- The `stats_users` setting used `monitoring`, but `userlist.txt` omitted that user and the Prometheus exporter example connected as `stats`. Added `monitoring` to `userlist.txt` and updated the exporter connection string.
- The SCRAM placeholders in `userlist.txt` used an incomplete `SCRAM-SHA-256$4096:salt$hash` shape. Updated them to show the documented `salt$storedkey:serverkey` structure.
- The pool mode compatibility table incorrectly treated all prepared statements as unsupported in transaction pooling and statement pooling, and combined `LISTEN/NOTIFY` as unsupported. Updated the table to distinguish protocol-level prepared statements from SQL `PREPARE`/`DEALLOCATE`, and to distinguish `LISTEN` from `NOTIFY`.
- The statement pooling limitations said there are no transactions or prepared statements. Updated it to the documented limitation: multi-statement transactions are disallowed, and SQL-level prepared statements are not compatible.
- The pool sizing formula used peak concurrent requests divided by average transaction time, which is dimensionally incorrect. Changed it to transaction rate multiplied by average transaction time, and updated the example wording to requests per second.
- The dynamic authentication example queried `pg_shadow` directly and suggested granting access to it. Updated the example to use PgBouncer's documented `pg_authid`-based default query and noted that a SECURITY DEFINER function is preferred for non-superuser access.

## Review Notes
- PgBouncer's `auth_type = md5` is still a valid PgBouncer setting, but PostgreSQL MD5 password hashes are deprecated and should be avoided for new deployments.
- The multi-host replica example is syntactically valid for PgBouncer, but PgBouncer's documentation notes that all hosts in a comma-separated host list should be available and that this behavior differs from libpq host lists.
