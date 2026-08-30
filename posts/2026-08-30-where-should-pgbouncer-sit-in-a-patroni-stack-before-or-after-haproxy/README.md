# Where Should PgBouncer Sit in a Patroni Stack: Before or After HAProxy?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Patroni, PgBouncer, HAProxy, Connection Pooling, Failover, Traffic Routing

Description: Compare PgBouncer placement patterns in a Patroni stack and choose a topology that cannot retain hidden connections to the former primary.

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

It centralizes pools, but every PgBouncer server connection is a long-lived TCP connection through HAProxy. HAProxy chooses a backend only when that connection opens. After a primary changes, an existing server connection cannot be moved to the new node. This is the crucial placement trade-off.

## Understand what each component knows

Patroni owns PostgreSQL role management and leader election. HAProxy interprets Patroni's `/primary` or `/replica` health endpoints and selects a backend for a new TCP stream. PgBouncer multiplexes PostgreSQL protocol sessions; it does not query Patroni, elect a primary, or reroute a live server connection.

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

Change `listen_addr` on each host. Size the sum of all possible local pools below PostgreSQL's connection budget; limits are per PgBouncer instance and per user/database pool.

HAProxy sends accepted streams to `6432`, while checking both Patroni's role endpoint and the pooler listener:

```haproxy
backend write_poolers
    mode tcp
    option httpchk
    http-check connect port 8008
    http-check send meth GET uri /primary ver HTTP/1.1 hdr Host patroni
    http-check expect status 200
    http-check connect port 6432
    default-server inter 2s fall 3 rise 2 on-marked-down shutdown-sessions
    server pg1 10.40.0.11:6432 check
    server pg2 10.40.0.12:6432 check
    server pg3 10.40.0.13:6432 check
```

The first check selects the Patroni primary. The second confirms something accepts TCP on the PgBouncer port. Keep an end-to-end SQL probe as well; a listener check cannot detect bad database credentials or exhausted pools.

When Patroni demotes a node, `/primary` fails there. `on-marked-down shutdown-sessions` then ends streams from HAProxy to that node's pooler. Applications see disconnects and reconnect through HAProxy to the new primary's local pooler. The behavior is disruptive but explicit—there is no hidden pool still talking to the old destination.

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

Run at least two central PgBouncers and two HAProxy instances. After failover, broken old-primary connections will eventually be replaced through HAProxy, but healthy-looking pooled connections do not automatically follow HAProxy's changed backend state.

PgBouncer's administration commands have distinct semantics:

- `RECONNECT app` marks server connections for closure after release. New connections may open immediately, so old and new destinations can coexist for a while. PgBouncer explicitly recommends this for gradual changes, not an atomic writer move.
- `PAUSE app` waits until server connections can be disconnected according to the pooling mode. New clients wait until `RESUME app`. This suits a controlled switchover, but session pooling may wait for clients to disconnect.
- `KILL app` immediately drops client and server connections and leaves new clients waiting until `RESUME app`. It is an emergency operation, not a graceful drain.
- `SHOW SERVERS` exposes each downstream `addr`, state, connection time, and `close_needed` flag; use it to prove no server connection still targets the old route.

For a planned primary switchover, a central-pooler runbook can pause the database, perform and verify the Patroni switchover, then resume. For an unplanned failover, the application must already tolerate connection loss; do not build an automation that waits forever for unsafe old sessions to drain.

## Pick the pooling mode separately

Placement does not decide `pool_mode`:

| Mode | Server connection released | Main consequence |
| --- | --- | --- |
| `session` | Client disconnect | Full session semantics, weak multiplexing and slow drains |
| `transaction` | Transaction end | Good multiplexing; clients cannot rely on one server session |
| `statement` | Statement end | Multi-statement transactions are disallowed |

Transaction pooling requires an application audit. Session-level `SET`, `LISTEN`, SQL-level prepared statements, session advisory locks, and temporary state do not behave as they do on a dedicated connection. Current PgBouncer can track protocol-level named prepared statements when `max_prepared_statements` is nonzero, but that does not make every session feature safe.

## Make the decision with failure tests

For either topology, record these answers in staging:

1. Which exact component drops the old-primary connection?
2. How long until all new writes reach the promoted node?
3. Can `SHOW SERVERS` or HAProxy runtime state reveal an old destination?
4. What happens to an in-flight transaction with an ambiguous commit outcome?
5. Are pool limits safe when every PgBouncer instance is active?

Always verify the write path with SQL:

```sql
SELECT inet_server_addr(),
       pg_is_in_recovery(),
       current_setting('transaction_read_only');
```

A write endpoint must return `false` and `off`. Middleware health alone is not sufficient.

## Official Documentation

- [Patroni REST API](https://patroni.readthedocs.io/en/latest/rest_api.html)
- [Patroni dynamic configuration](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html)
- [PgBouncer features and pooling modes](https://www.pgbouncer.org/features.html)
- [PgBouncer configuration](https://www.pgbouncer.org/config.html)
- [PgBouncer administration commands](https://www.pgbouncer.org/usage.html)
- [HAProxy configuration manual](https://docs.haproxy.org/3.4/configuration.html)
- [PostgreSQL hot standby](https://www.postgresql.org/docs/current/hot-standby.html)

## Conclusion

Prefer HAProxy followed by a node-local PgBouncer when you want the simplest, most observable failover path. Put central PgBouncer before HAProxy only when centralized pooling is worth the extra connection-lifecycle runbook. In both cases, HAProxy routes only new streams, PgBouncer never elects a writer, and applications must reconnect and retry safe transactions.
