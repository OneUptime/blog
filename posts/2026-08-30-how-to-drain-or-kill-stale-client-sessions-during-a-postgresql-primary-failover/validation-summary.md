# Validation Summary: How to Drain or Kill Stale Client Sessions During a PostgreSQL Primary Failover

## Status

validated

## Post Type

Operational guide / tutorial

## Technologies Covered

- PostgreSQL
- Patroni and `patronictl`
- PgBouncer
- HAProxy configuration and Runtime API
- TCP connection pooling and primary failover
- Shell, `curl`, `psql`, and `socat`

## Sources Consulted

- [Patroni REST API](https://patroni.readthedocs.io/en/latest/rest_api.html)
- [Patroni `patronictl` documentation](https://patroni.readthedocs.io/en/latest/patronictl.html)
- [PgBouncer usage and administration commands](https://www.pgbouncer.org/usage.html)
- [PgBouncer configuration reference](https://www.pgbouncer.org/config.html)
- [PgBouncer changelog](https://www.pgbouncer.org/changelog.html)
- [PgBouncer 1.25.2 security release](https://www.pgbouncer.org/2026/05/pgbouncer-1-25-2)
- [HAProxy Runtime API: `shutdown sessions server`](https://www.haproxy.com/documentation/haproxy-runtime-api/reference/shutdown-sessions-server/)
- [HAProxy Runtime API: `show sess`](https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-sess/)
- [HAProxy 3.4 configuration manual](https://docs.haproxy.org/3.4/configuration.html)
- [HAProxy 3.4 management guide](https://docs.haproxy.org/3.4/management.html)
- [PostgreSQL server signaling functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-SIGNAL)
- [PostgreSQL `pg_stat_activity`](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-ACTIVITY-VIEW)
- [PostgreSQL session and system information functions](https://www.postgresql.org/docs/current/functions-info.html)
- [PostgreSQL `transaction_read_only`](https://www.postgresql.org/docs/current/runtime-config-client.html#GUC-TRANSACTION-READ-ONLY)
- [PostgreSQL 14 release notes](https://www.postgresql.org/docs/release/14.0/)

## Issues Found

- PgBouncer's `SHOW SERVERS` reports its immediate downstream endpoint, which is HAProxy in the topology shown; it does not reveal the PostgreSQL node selected behind HAProxy. The post now identifies the address as the immediate downstream address and changes the recovery check to use PgBouncer connection times for pre-cutover connections while checking HAProxy itself for streams to the former writer.
- HAProxy's `shutdown sessions server` ends current streams but does not by itself change whether HAProxy can select that server for new connections. The post now requires the former writer to be `DOWN` or in maintenance before the emergency stream termination, preventing reconnects from being routed straight back to it.
- The example named an administrative PgBouncer user without stating the authorization requirement for the process-control commands. The post now says that the account used for `PAUSE`, `RECONNECT`, `WAIT_CLOSE`, `KILL`, and `RESUME` must be listed in `admin_users`.
- The `KILL_CLIENT` explanation omitted its server-side effect. The post now states that killing a client also terminates any PgBouncer server connection currently linked to that client.

## Review Notes

- All Patroni, HAProxy, PgBouncer, shell, and SQL command syntax is current and matches the documented behavior.
- `KILL_CLIENT` and the stable client `id` field require PgBouncer 1.24 or later. PgBouncer 1.25.2 fixed an authorization vulnerability affecting `KILL_CLIENT` in earlier releases, so deployments using this command should run 1.25.2 or later.
- The optional timeout argument to `pg_terminate_backend` was added in PostgreSQL 14. The post uses the one-argument form, which remains compatible with older installations.
- The Patroni REST examples assume an unauthenticated HTTP endpoint. Deployments configured for TLS or REST authentication must supply the corresponding protocol and credentials.
- Viewing complete activity details for sessions owned by other roles can require superuser or `pg_read_all_stats` privileges. This does not affect the validity of the inspection query.
