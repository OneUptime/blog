# How to Drain or Kill Stale Client Sessions During a PostgreSQL Primary Failover

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Patroni, PgBouncer, HAProxy, Failover, Connection Pooling, High Availability

Description: Remove connections to a former PostgreSQL primary at the HAProxy, PgBouncer, and database layers without hiding failed or ambiguous transactions.

---

A PostgreSQL failover changes the writer for new work. It cannot move an existing TCP connection, SQL session, or transaction to the promoted server. A stale session must finish, fail, or be terminated; the application then establishes a new session through the write endpoint.

This distinction explains many post-failover incidents. HAProxy correctly routes new connections, yet a central PgBouncer still owns server connections opened before the role change. Or HAProxy marks the old primary down but leaves established streams alive. The fix depends on which layer owns the stale connection.

## Map the two halves of every connection

With a central pooler, the path contains two persistent legs:

```text
application --client connection--> PgBouncer
PgBouncer --server connection--> HAProxy --TCP stream--> PostgreSQL
```

In transaction pooling, many client sessions reuse a smaller set of server connections. Killing a PostgreSQL backend ends the server leg and may affect whichever client currently owns it. Killing a PgBouncer client ends that application's client leg. HAProxy's runtime command ends streams tied to one backend server.

Before acting, establish three facts:

1. Patroni reports exactly one intended primary.
2. The target is truly the former primary, not the newly promoted writer.
3. You know whether you need a graceful planned drain or an emergency cutover.

```bash
patronictl -c /etc/patroni/patroni.yml list prod-ha

for host in 10.40.0.11 10.40.0.12 10.40.0.13; do
  curl --silent --output /dev/null --write-out "$host %{http_code}\n" \
    "http://$host:8008/primary"
done
```

Do not terminate sessions based only on a remembered hostname. Roles can change again while an incident is in progress.

## Make HAProxy stop old-backend streams

Normal health checks stop new traffic to a down server; they do not necessarily close existing streams. For a Patroni write backend, configure explicit closure on the transition to `DOWN`:

```haproxy
backend patroni_primary
    mode tcp
    option httpchk
    http-check connect port 8008
    http-check send meth GET uri /primary ver HTTP/1.1 hdr Host patroni
    http-check expect status 200
    default-server inter 2s fall 3 rise 2 on-marked-down shutdown-sessions
    server pg1 10.40.0.11:5432 check
    server pg2 10.40.0.12:5432 check
    server pg3 10.40.0.13:5432 check
```

This closes streams once the old server crosses the configured `fall` threshold. It deliberately produces connection errors so clients reconnect through the now-correct backend.

For an operator-controlled emergency, HAProxy's Runtime API provides `shutdown sessions server` (called streams in newer HAProxy terminology):

```bash
printf 'shutdown sessions server patroni_primary/pg1\n' \
  | socat stdio /run/haproxy/admin.sock
```

The socket must be configured at administrative level and protected by filesystem permissions. Resolve `pg1` from fresh Patroni state first, and ensure HAProxy has already marked it `DOWN` or placed it in maintenance. `shutdown sessions server` terminates current streams, but it does not change HAProxy server selection or PostgreSQL roles.

## Choose the correct PgBouncer command

Connect to PgBouncer's special administration database and inspect downstream connections:

```bash
psql -h pgbouncer.internal -p 6432 -U pgbouncer_admin pgbouncer \
  -c 'SHOW SERVERS;'
```

`SHOW SERVERS` includes the immediate downstream address (HAProxy in this topology), state, connection time, and `close_needed`. The account used for the process-control commands below must be listed in `admin_users`. Then choose one of the documented controls:

### Graceful, planned switchover

```sql
PAUSE app;
-- perform and verify the Patroni switchover from a separate admin session
RESUME app;
```

`PAUSE` waits for server connections to be released according to pool mode. In transaction pooling that means transactions finish; in session pooling it can wait for the client to disconnect. New clients wait while the database is paused. Set an operational deadline—an abandoned transaction must not block maintenance indefinitely.

### Gradual downstream refresh

```sql
RECONNECT app;
WAIT_CLOSE app;
```

`RECONNECT` closes server connections after release, and `WAIT_CLOSE` waits until marked connections have cleared. PgBouncer warns that old and new destinations can coexist during this process because replacement connections may open immediately. That makes it inappropriate when every write connection must change atomically.

### Emergency failover

```sql
KILL app;
-- verify the promoted primary and downstream route
RESUME app;
```

`KILL` immediately drops client and server connections for the database (not the admin database), and new clients wait for `RESUME`. Use it only when retaining old connections is more dangerous than interrupting all clients. To target one client, get its `id` from `SHOW CLIENTS` and use `KILL_CLIENT id`; this also terminates any server connection currently linked to that client.

## Terminate database backends only with a narrow predicate

PostgreSQL exposes sessions in `pg_stat_activity`. On a confirmed former-primary node, inspect before signaling:

```sql
SELECT pid, usename, datname, application_name, client_addr,
       state, xact_start, backend_start
FROM pg_stat_activity
WHERE backend_type = 'client backend'
ORDER BY xact_start NULLS LAST, backend_start;
```

`pg_cancel_backend(pid)` cancels a current query but leaves the session. `pg_terminate_backend(pid)` terminates the session. Current PostgreSQL also accepts a timeout in milliseconds, but omit it if your supported server versions predate that form.

Terminate only the application population you have identified:

```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE backend_type = 'client backend'
  AND usename = 'app_user'
  AND datname = 'app'
  AND pid <> pg_backend_pid();
```

Never use a blanket predicate that can kill replication, Patroni, backup, monitoring, or your own control session. Signaling another role's backend requires appropriate membership, `pg_signal_backend`, or superuser rights; superuser backends can only be signaled by a superuser.

Usually it is better to break the stale connection at HAProxy or PgBouncer. Direct database termination is valuable when a reachable former primary still has application backends, but it is not a routing policy.

## Treat transaction outcome correctly

A disconnect does not prove that an in-flight transaction rolled back. The server may have committed just before the acknowledgement was lost. Blindly retrying such a transaction can duplicate a payment, job, or event.

Applications should:

- retry complete transactions, not individual statements inside a broken transaction;
- use bounded exponential backoff and a retry budget;
- make writes idempotent with stable operation keys where possible;
- reconcile an ambiguous commit before repeating a non-idempotent action; and
- re-establish session state after reconnecting.

Confirm recovery with a fresh connection through the public write endpoint:

```sql
SELECT inet_server_addr(),
       pg_is_in_recovery(),
       current_setting('transaction_read_only');
```

Expect `false` and `off`, then use PgBouncer `SHOW SERVERS` connection times to confirm that no server connection predates the cutover, and verify that HAProxy reports no current stream to the old writer.

## Official Documentation

- [Patroni REST API](https://patroni.readthedocs.io/en/latest/rest_api.html)
- [PgBouncer administration commands](https://www.pgbouncer.org/usage.html)
- [PgBouncer connection and timeout configuration](https://www.pgbouncer.org/config.html)
- [HAProxy Runtime API: shut down server sessions](https://www.haproxy.com/documentation/haproxy-runtime-api/reference/shutdown-sessions-server/)
- [HAProxy configuration manual](https://docs.haproxy.org/3.4/configuration.html)
- [PostgreSQL server signaling functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-SIGNAL)
- [PostgreSQL `pg_stat_activity`](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-ACTIVITY-VIEW)

## Conclusion

Drain during controlled switchovers and terminate during emergencies, but act at the layer that owns the stale connection. Make HAProxy close streams to a demoted backend, use PgBouncer's `PAUSE`, `RECONNECT`, or `KILL` according to their documented semantics, and reserve `pg_terminate_backend` for a precisely identified session population. Always make clients handle disconnects and ambiguous commits safely.
