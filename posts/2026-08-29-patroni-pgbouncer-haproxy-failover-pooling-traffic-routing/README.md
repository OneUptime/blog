# Patroni, PgBouncer, and HAProxy: Which Layer Handles Failover, Pooling, and Traffic Routing?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Patroni, PgBouncer, HAProxy, High Availability, Failover, Connection Pooling, Traffic Routing

Description: Separate the responsibilities of Patroni, PgBouncer, and HAProxy, then combine them without stale pools, unsafe routing, or hidden single points of failure.

---

Patroni, PgBouncer, and HAProxy solve different problems. Treating them as interchangeable is a common cause of failed PostgreSQL failovers: a pooler does not elect a primary, a load balancer does not repair replication, and Patroni does not provide a stable client connection endpoint.

The shortest accurate model is:

| Layer | Decides or manages | Does not do |
| --- | --- | --- |
| Patroni | PostgreSQL role, leader election, promotion, demotion, replica creation, cluster configuration | Pool client connections or provide one redundant application address |
| PgBouncer | Reuse and limit PostgreSQL server connections per user/database pool | Determine the Patroni leader or promote a replica |
| HAProxy | Route new TCP connections to servers whose Patroni health check matches a role | Preserve SQL session state, retry transactions, or elect a primary |

etcd or another supported distributed configuration store sits underneath Patroni. It is the consensus authority for the leader lock; none of the three layers above should replace it.

## Follow the state change through the stack

During a failover:

1. Patroni notices that the leader lock is absent or the primary is unhealthy.
2. An eligible replica wins the leader race and PostgreSQL is promoted on a new timeline.
3. The promoted node's Patroni endpoint begins returning `200` for `/primary`; the other nodes return `503` for that endpoint.
4. HAProxy removes the old server and sends new write connections to the new primary.
5. PgBouncer discards or eventually recycles server connections that were attached to the old primary. Applications reconnect and retry complete transactions whose outcome is known to be safe to retry.

Existing TCP sessions do not teleport between database servers. If a connection breaks during promotion, only the application knows whether its transaction is idempotent and whether an ambiguous commit must be checked before retrying.

## Choose a topology deliberately

There are two useful placement patterns.

### Pattern A: HAProxy routes to a PgBouncer beside each database

```text
application -> redundant HAProxy -> PgBouncer on selected node -> local PostgreSQL
                                     ^
                                     HAProxy checks Patroni on that same node
```

This pattern keeps the selected role and the pooler's local database aligned. HAProxy sends client traffic to port `6432`; its check must verify both Patroni's role on `8008` and the selected node's PgBouncer listener:

```haproxy
backend write_poolers
    mode tcp
    option httpchk
    http-check connect port 8008
    http-check send meth GET uri /primary ver HTTP/1.1 hdr Host patroni
    http-check expect status 200
    http-check connect port 6432
    default-server inter 2s fall 3 rise 2
    server pg1-pool 10.40.0.11:6432 check
    server pg2-pool 10.40.0.12:6432 check
    server pg3-pool 10.40.0.13:6432 check
```

The final `http-check connect` starts a second connection and fails the sequence when PgBouncer is not listening. It is only a TCP-listener check; retain an end-to-end SQL probe through HAProxy and PgBouncer to detect authentication, pool exhaustion, or a broken local database path. Without this second step, a healthy Patroni API can leave a dead PgBouncer backend marked up.

Each local PgBouncer has a fixed local destination:

```ini
[databases]
app = host=127.0.0.1 port=5432 dbname=app

[pgbouncer]
listen_addr = 10.40.0.11
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 40
reserve_pool_size = 10
server_connect_timeout = 5
server_login_retry = 2
admin_users = pgbouncer_admin
stats_users = monitor
```

Use the node's own address for `listen_addr` on each host. Protect PgBouncer's admin database and credentials, and use TLS on untrusted networks.

Advantages:

- HAProxy's role decision applies to the same physical node that accepts the pooled connection.
- A new primary can already have a warm local PgBouncer process.
- The load-balancing configuration does not depend on a floating DNS record inside PgBouncer.

Trade-offs:

- Every database node needs a configured and monitored pooler.
- A failover drops connections to the old node's pooler. This is explicit and usually safer than silently retaining sessions to the demoted database.
- Pool limits are per PgBouncer instance. Size the aggregate possible connections against PostgreSQL `max_connections`.

### Pattern B: a central PgBouncer connects through HAProxy

```text
application -> redundant PgBouncer -> redundant HAProxy -> selected PostgreSQL
```

PgBouncer can use one stable HAProxy write address:

```ini
[databases]
app = host=postgres-write.internal port=5000 dbname=app
```

This centralizes pool configuration, but an already-open PgBouncer server connection remains attached to the old backend until it closes. HAProxy affects only new TCP connections. A Patroni demotion normally terminates or makes old-primary sessions unusable, after which PgBouncer reconnects through HAProxy, but the recovery interval depends on workload and pool settings.

If this pattern is used:

- Run more than one PgBouncer and HAProxy instance; do not replace a database single point of failure with a pooler or proxy single point of failure.
- Keep `server_login_retry` short enough for the desired recovery time without creating a retry storm.
- Use `RECONNECT` during a controlled role change if idle server connections need to be closed when released.
- Understand that `server_lifetime` closes only unused server connections older than the limit; it is not an HA election mechanism.

## Select the PgBouncer pooling mode by application semantics

PgBouncer offers three modes:

| Mode | Server connection is released | Compatibility |
| --- | --- | --- |
| `session` | When the client disconnects | Supports all PostgreSQL features; weakest multiplexing |
| `transaction` | At transaction end | Efficient, but session state cannot be assumed to stay on one backend |
| `statement` | At statement end | Disallows multi-statement transactions and is rarely appropriate for general applications |

Transaction pooling requires application review. Session-level `SET`, `LISTEN`, SQL `PREPARE`, session advisory locks, and persistent temporary-table state are among the features that do not behave like a dedicated session. Protocol-level prepared plans require PgBouncer's `max_prepared_statements` support. Choose session pooling if the application cannot honor these constraints.

Always give every transaction an explicit boundary. A transaction left open consumes one server connection in transaction pooling and may block maintenance or failover cleanup.

## Use Patroni endpoints as role selectors

Patroni's REST API has deliberately strict status semantics:

| Endpoint | Returns `200` when |
| --- | --- |
| `/primary` or `/read-write` | PostgreSQL is running as primary and this Patroni member holds the leader lock |
| `/leader` | This member holds the leader lock, regardless of whether PostgreSQL is currently primary or standby-leader |
| `/replica` | PostgreSQL is running as a replica and `noloadbalance` is not set |
| `/replica?lag=64MB` | The replica conditions hold and its DCS-derived lag is below the threshold |
| `/health` | PostgreSQL is up, without asserting its role |

For a write backend, use `/primary`, not `/health`. A healthy replica should never pass a write check. For read traffic, use `/replica` with an application-appropriate lag limit. A `503` from a role endpoint usually means “healthy node, wrong role” rather than “REST API is broken.”

## Configure separate service endpoints

A complete HAProxy split between write and replica services looks like this:

```haproxy
defaults
    mode tcp
    timeout connect 3s
    timeout client  30m
    timeout server  30m
    timeout check   2s

frontend postgres_write
    bind :5000
    default_backend write_poolers

backend write_poolers
    option httpchk
    http-check connect port 8008
    http-check send meth GET uri /primary ver HTTP/1.1 hdr Host patroni
    http-check expect status 200
    http-check connect port 6432
    default-server inter 2s fall 3 rise 2
    server pg1 10.40.0.11:6432 check
    server pg2 10.40.0.12:6432 check
    server pg3 10.40.0.13:6432 check

frontend postgres_read
    bind :5001
    default_backend replica_poolers

backend replica_poolers
    balance roundrobin
    option httpchk
    http-check connect port 8008
    http-check send meth GET uri /replica?lag=64MB ver HTTP/1.1 hdr Host patroni
    http-check expect status 200
    http-check connect port 6432
    default-server inter 2s fall 3 rise 2
    server pg1 10.40.0.11:6432 check
    server pg2 10.40.0.12:6432 check
    server pg3 10.40.0.13:6432 check
```

The first check connection goes to port `8008`, the final listener check goes to `6432`, and accepted client connections also go to `6432`. HAProxy can perform this multi-connection HTTP check sequence even though the traffic backend is TCP.

The `30m` values are illustrative inactivity timeouts. Set `timeout client` and `timeout server` from the application's legitimate idle-session and long-query behavior; they are not SQL statement deadlines. Values such as `30s` can unexpectedly sever quiet persistent sessions or queries that emit no network traffic.

Do not make one read/write listener that round-robins across primary and replicas. PostgreSQL read-only errors are not a routing protocol, and a transaction must not change servers halfway through.

## Verify every layer independently

Start at the role authority and move outward:

```bash
patronictl -c /etc/patroni/patroni.yml list prod-ha

curl --include http://10.40.0.11:8008/primary
curl --include http://10.40.0.12:8008/replica

psql -h 10.40.0.11 -p 6432 pgbouncer -U pgbouncer_admin \
  -c 'SHOW POOLS;'

psql "host=postgres-write.internal port=5000 dbname=app user=app" \
  -c "SELECT inet_server_addr(), pg_is_in_recovery(), current_setting('transaction_read_only');"
```

Expected write-path results are `pg_is_in_recovery() = false` and `transaction_read_only = off`. On the read path, expect `pg_is_in_recovery() = true` and design the application for replica lag.

Monitor at least:

- Patroni leader and timeline changes, DCS access, and replication lag.
- HAProxy backend up/down state and the count of eligible primary servers. Zero is an outage; more than one is a safety emergency.
- PgBouncer `SHOW POOLS`, waiting clients, used server connections, login failures, and file-descriptor use.
- Application reconnect rate, transaction retries, ambiguous commits, and end-to-end query success.

## Failure modes and recovery

| Failure | What the layers do | Operator response |
| --- | --- | --- |
| PostgreSQL primary crashes | Patroni elects/promotes; HAProxy follows `/primary`; PgBouncer opens new server connections | Confirm one leader, then investigate and rejoin the old primary |
| HAProxy cannot reach Patroni REST | It marks that backend down even if PostgreSQL port `5432` is open | Restore REST network/TLS access; never replace `/primary` with a TCP-only check |
| PgBouncer has old idle server connections | Connections may still point at the demoted node until released or broken | Use `RECONNECT` when appropriate and verify new server connections reach the leader |
| Transaction pool breaks session state | Application assumed a dedicated backend | Change the application or use session pooling |
| One central PgBouncer fails | Clients lose the pooling endpoint | Run redundant poolers with independent health checks and service discovery |
| Clients see errors during failover | Existing sessions were interrupted | Retry complete, idempotent transactions with bounded backoff; inspect ambiguous commits |

If routing is wrong, first remove application traffic from the affected proxy while retaining an administrative path. Restore the last known-good HAProxy or PgBouncer configuration, validate it, and reload one redundant instance at a time. A proxy rollback does not change the PostgreSQL leader; confirm Patroni state again before reopening traffic.

Never fix routing by manually promoting PostgreSQL or by configuring PgBouncer with a comma-separated list of primary and replica addresses for writes. Role selection belongs to Patroni plus a role-aware routing layer.

## References

- [Patroni REST API](https://patroni.readthedocs.io/en/latest/rest_api.html)
- [Patroni documentation](https://patroni.readthedocs.io/en/latest/README.html)
- [PgBouncer features and pooling modes](https://www.pgbouncer.org/features.html)
- [PgBouncer configuration](https://www.pgbouncer.org/config.html)
- [PgBouncer administration commands](https://www.pgbouncer.org/usage.html)
- [HAProxy configuration manual](https://docs.haproxy.org/3.4/configuration.html)
