# Where Should PgBouncer Sit in a Patroni Stack: Before or After HAProxy?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Patroni, PgBouncer, HAProxy, Connection Pooling, Failover, Traffic Routing

Description: Compare PgBouncer placement patterns in a Patroni stack and choose a topology and controls that prevent the write endpoint from continuing to use pooled connections to the former primary.

---

The safest default is to run one PgBouncer beside each PostgreSQL member and place those poolers behind HAProxy:

```text
application -> redundant HAProxy -> PgBouncer on selected node -> local PostgreSQL
```

That answer is not universal, but it makes the role decision and the database destination line up. HAProxy checks Patroni on a node and sends the client to PgBouncer on that same node. PgBouncer always connects to its local PostgreSQL instance.

The alternative is a central pooler in front of the routing layer:

```text
application -> redundant PgBouncer -> redundant HAProxy -> Patroni primary
```

It centralizes pools, but every PgBouncer server connection is a long-lived TCP connection through HAProxy. HAProxy selects a backend server when it establishes the server side of that TCP stream. After a primary changes, the existing stream cannot be migrated to the new node. This is the crucial placement trade-off.

## Understand what each component knows

Patroni owns PostgreSQL role management and leader election. HAProxy interprets Patroni's `/primary` or `/replica` health endpoints and selects a backend server for a new TCP stream. PgBouncer multiplexes PostgreSQL protocol sessions; it does not query Patroni, elect a primary, or reroute a live server connection.

No ordering changes those facts. A working design must also provide redundant instances of the outermost component. One central PgBouncer or one HAProxy merely replaces the database single point of failure with middleware.

## Pattern A: local PgBouncer behind HAProxy

On every database host, configure PgBouncer with a fixed local destination:

```ini
[databases]
app = host=127.0.0.1 port=5432 dbname=app

[pgbouncer]
listen_addr = 10.40.0.11
listen_port = 6432
pool_mode = transaction
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt
max_client_conn = 1000
default_pool_size = 40
reserve_pool_size = 10
admin_users = pgbouncer_admin
stats_users = monitor
```

Change `listen_addr` on each host. On each node, size that PgBouncer instance's possible user/database pools, including reserve capacity, below the local PostgreSQL connection budget. `max_client_conn` is per PgBouncer process, while the pool sizes shown are per user/database pair.

HAProxy sends accepted streams to `6432`, while checking both Patroni's role endpoint and the pooler listener:

```haproxy
backend write_poolers
    mode tcp
    option httpchk
    http-check connect port 8008
    http-check send meth GET uri /primary ver HTTP/1.1 hdr Host patroni
    http-check expect status 200
    http-check connect port 6432
    default-server inter 2s fall 3 rise 2 init-state fully-down on-marked-down shutdown-sessions
    server pg1 10.40.0.11:6432 check
    server pg2 10.40.0.12:6432 check
    server pg3 10.40.0.13:6432 check
```

The first three rules make only a node that returns `200` for Patroni's `/primary` eligible. The final connect confirms something accepts TCP on the PgBouncer port. Keep an end-to-end SQL probe as well; a listener check cannot detect bad database credentials or exhausted pools.

When Patroni demotes a node or it no longer holds the leader lock, `/primary` fails there. After the configured failure threshold marks the server down, `on-marked-down shutdown-sessions` ends streams from HAProxy to that node's pooler. Applications see disconnects and reconnect through HAProxy to the new primary's local pooler. The behavior is disruptive but explicit: HAProxy no longer routes the writer endpoint to that pooler. The local PgBouncer may retain server connections to its PostgreSQL instance until PgBouncer or PostgreSQL closes them, but they are no longer on the writer path.

This pattern is a strong fit when:

- the primary can move frequently;
- transaction pooling materially reduces PostgreSQL connection pressure;
- each database node can run and monitor a small local pooler; and
- dropping client sessions at failover is acceptable and retried at the transaction boundary.

## Pattern B: central PgBouncer before HAProxy

A central PgBouncer database entry can point to one redundant HAProxy service:

```ini
[databases]
app = host=postgres-router.internal port=5000 dbname=app

[pgbouncer]
pool_mode = transaction
server_connect_timeout = 5
server_login_retry = 2
```

Run at least two central PgBouncers and two HAProxy instances. After failover, broken old-primary connections will eventually be replaced through HAProxy, but, without explicit stream invalidation, healthy-looking pooled connections do not automatically follow HAProxy's changed backend state. A central HAProxy database backend can use the Patroni role check with `on-marked-down shutdown-sessions` too; once it marks the old server down, it terminates those PgBouncer server streams and replacement connections are routed to the new primary.

PgBouncer's administration commands have distinct semantics:

- `RECONNECT app` marks server connections for closure after release. New connections may open immediately, so old and new destinations can coexist for a while. PgBouncer explicitly recommends this for gradual changes, not an atomic writer move.
- `PAUSE app` waits until server connections can be disconnected according to the pooling mode. New clients wait until `RESUME app`. This suits a controlled switchover, but session pooling may wait for clients to disconnect.
- `KILL app` immediately drops client and server connections and leaves new clients waiting until `RESUME app`. It is an emergency operation, not a graceful drain.
- `SHOW SERVERS` exposes each server socket's immediate peer `addr`, state, `connect_time`, and `close_needed` flag. Here `addr` identifies HAProxy, not the PostgreSQL member that HAProxy selected. After `RECONNECT app`, `WAIT_CLOSE app` proves that all server connections marked `close_needed` have closed; inspect runtime stream state on every HAProxy instance to prove no stream remains on the former primary.

For a planned primary switchover, pause `app` on every central PgBouncer and wait for every `PAUSE` command to return, perform and verify the Patroni switchover, then resume every pooler. For an unplanned failover, the application must already tolerate connection loss; do not build an automation that waits forever for unsafe old sessions to drain.

## Pick the pooling mode separately

Placement does not decide `pool_mode`:

| Mode | Server connection released | Main consequence |
| --- | --- | --- |
| `session` | Client disconnect | Full session semantics, weak multiplexing and slow drains |
| `transaction` | Transaction end | Good multiplexing; clients cannot rely on one server session |
| `statement` | Statement end | Multi-statement transactions are disallowed |

Transaction pooling requires an application audit. Untracked session-level `SET`/`RESET`, `LISTEN`, SQL-level `PREPARE`/`DEALLOCATE`, session advisory locks, and temporary state that persists past commit do not behave as they do on a dedicated connection. Current PgBouncer can track protocol-level named prepared statements when `max_prepared_statements` is nonzero, but that does not make every session feature safe.

## Make the decision with failure tests

For either topology, record these answers in staging:

1. Which exact component drops the old-primary connection?
2. How long until all new writes reach the promoted node?
3. Can PgBouncer show which server sockets are pending closure, and can HAProxy runtime stream state reveal any stream on the old destination?
4. What happens to an in-flight transaction with an ambiguous commit outcome?
5. Are pool limits safe when every PgBouncer instance is active?

Inspect the routed PostgreSQL session with SQL:

```sql
SELECT inet_server_addr(),
       pg_is_in_recovery(),
       current_setting('transaction_read_only');
```

A normally configured write endpoint should return `false` and `off`. With the node-local connection string above, `inet_server_addr()` normally reports `127.0.0.1`, so correlate the result with HAProxy or host monitoring when node identity matters. These are necessary session-state checks, not proof that the node holds Patroni's leader lock or that an application write succeeds; retain a rollback-safe application-level write probe because middleware health alone is not sufficient.

## Official Documentation

- [Patroni REST API](https://patroni.readthedocs.io/en/latest/rest_api.html)
- [Patroni dynamic configuration](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html)
- [PgBouncer features and pooling modes](https://www.pgbouncer.org/features.html)
- [PgBouncer configuration](https://www.pgbouncer.org/config.html)
- [PgBouncer administration commands](https://www.pgbouncer.org/usage.html)
- [HAProxy configuration manual](https://docs.haproxy.org/3.4/configuration.html)
- [PostgreSQL hot standby](https://www.postgresql.org/docs/current/hot-standby.html)

## Conclusion

Prefer HAProxy followed by a node-local PgBouncer when you want the simplest, most observable failover path. Put central PgBouncer before HAProxy only when centralized pooling is worth explicitly managing downstream stream lifecycles. In both cases, HAProxy makes backend-server selections only for new streams and does not migrate existing streams, PgBouncer never elects a writer, and applications must be prepared to reconnect after connection loss and retry only transactions that are safe to repeat.
