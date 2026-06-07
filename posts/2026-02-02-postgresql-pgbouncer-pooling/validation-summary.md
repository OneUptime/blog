# Validation Summary: How to Configure Connection Pooling with PgBouncer

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- PgBouncer (configuration, pool modes, TLS, admin console)
- PostgreSQL (authentication, pg_shadow, pg_stat_activity)
- HAProxy (TCP load balancing for HA)
- Prometheus (pgbouncer-exporter, alerting rules)
- Docker / docker-compose (edoburu/pgbouncer image)
- psycopg2 (Python connection pool)
- node-postgres (`pg` Pool)
- Django (DATABASES settings)
- OpenSSL (self-signed certificate generation)

## Sources Consulted
- PgBouncer official configuration reference: https://www.pgbouncer.org/config.html
- PgBouncer admin console / usage docs: https://www.pgbouncer.org/usage.html
- PostgreSQL `pg_shadow` system view docs: https://www.postgresql.org/docs/current/view-pg-shadow.html
- HikariCP pool sizing guidance (`connections = ((core_count * 2) + effective_spindle_count)`): https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing
- node-postgres connection parameters and Pool API: https://node-postgres.com/apis/pool
- psycopg2 pool documentation: https://www.psycopg.org/docs/pool.html
- HAProxy configuration manual: https://docs.haproxy.org/

## Issues Found
- **Invalid SQL using `SHOW` inside a subquery.** The "Key Metrics to Monitor" section contained:
  ```sql
  SELECT database, user, cl_active, cl_waiting, sv_active, sv_idle
  FROM (SELECT * FROM SHOW POOLS);
  ```
  and a similar query against `SHOW STATS`. PgBouncer's admin console is not a real SQL engine; `SHOW POOLS` / `SHOW STATS` are top-level commands that cannot be embedded as subqueries in a regular `SELECT`. Running either of those exact queries against the `pgbouncer` admin database produces a parse error. I replaced both with the bare `SHOW POOLS;` / `SHOW STATS;` commands, kept the column lists as inline comments documenting what to watch, and added a short note explaining why filtering/aggregation has to happen in the monitoring tool (e.g. the Prometheus exporter shown later in the post).

## Review Notes
- The `auth_query = SELECT usename, passwd FROM pg_shadow WHERE usename = $1` example works only if `pgbouncer_auth` is a superuser, because `pg_shadow` is restricted to superusers regardless of `GRANT SELECT`. The PgBouncer docs explicitly recommend wrapping this in a `SECURITY DEFINER` function owned by a superuser and granting EXECUTE to the auth user. The post's approach is a common starting point and not strictly "wrong", so I left it in place — but production deployments should prefer the SECURITY DEFINER pattern.
- `client_tls_protocols = tlsv1.2,tlsv1.3` and the `client_tls_ciphers` value follow PgBouncer's documented format. Note that the available TLS protocol versions depend on the OpenSSL the PgBouncer build is linked against.
- `application_name` is accepted as a top-level option by both `psycopg2.connect` (passed through to libpq) and `node-postgres` (via `connection-parameters.js`), so those examples are correct as written.
- The pool-sizing formula `(cpu_cores * 2) + effective_spindle_count` is the well-known HikariCP recommendation; it is a reasonable starting point but real-world tuning should still be based on measured workload, as the post notes.
- The `edoburu/pgbouncer` Docker image is a community image (not an official PgBouncer-published one). The post calls it "official", which is slightly loose phrasing — it is the most widely used community image but is not maintained by the PgBouncer project itself. Left as-is since this is editorial framing rather than a technical error that breaks anything.
- `server_login_retry = 1` is unusually aggressive — the default is 15 seconds in older versions. This will work but may cause rapid reconnect storms during PostgreSQL restarts; readers should consider raising it. Not changed because it is presented as one of several tunables.
