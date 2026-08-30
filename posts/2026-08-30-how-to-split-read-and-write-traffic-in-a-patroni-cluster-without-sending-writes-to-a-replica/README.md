# How to Split Read and Write Traffic in a Patroni Cluster Without Sending Writes to a Replica

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Patroni, HAProxy, High Availability, Traffic Routing, Streaming Replication, Replication Lag

Description: Expose separate Patroni-aware PostgreSQL write and read endpoints, enforce role checks, and keep replica lag and read-after-write behavior explicit.

---

A safe read/write split uses two endpoints with different contracts:

- `postgres-write.example.net:5000` sends new sessions only to the Patroni primary.
- `postgres-read.example.net:5001` distributes new sessions only across eligible replicas.

Do not create one listener that round-robins across every PostgreSQL node and hope failed writes reveal a replica. Routing decisions happen when a connection opens, and a transaction remains on that one server for the life of the connection.

## Route from Patroni's role state

Patroni's REST API exposes role-aware health checks. `/primary` returns success for the running primary that holds the leader lock. `/replica` returns success for a running replica when its `noloadbalance` tag is not set. A `lag` query limits replica eligibility by Patroni's calculated lag.

Configure HAProxy with separate frontends and backends:

```haproxy
defaults
    mode tcp
    timeout connect 3s
    timeout client  30m
    timeout server  30m
    timeout check   2s

frontend postgres_write
    bind :5000
    default_backend patroni_write

backend patroni_write
    option httpchk
    http-check connect port 8008
    http-check send meth GET uri /primary ver HTTP/1.1 hdr Host patroni
    http-check expect status 200
    default-server inter 2s fall 3 rise 2 on-marked-down shutdown-sessions
    server pg1 10.40.0.11:5432 check
    server pg2 10.40.0.12:5432 check
    server pg3 10.40.0.13:5432 check

frontend postgres_read
    bind :5001
    default_backend patroni_read

backend patroni_read
    balance roundrobin
    option httpchk
    http-check connect port 8008
    http-check send meth GET uri /replica?lag=64MB ver HTTP/1.1 hdr Host patroni
    http-check expect status 200
    default-server inter 2s fall 3 rise 2 on-marked-down shutdown-sessions
    server pg1 10.40.0.11:5432 check
    server pg2 10.40.0.12:5432 check
    server pg3 10.40.0.13:5432 check
```

HAProxy opens the health check on `8008` but sends accepted TCP traffic to the server line's `5432`. The `64MB` lag threshold is illustrative, not a universal safe value. Derive it from how much stale data the read workload can tolerate and confirm how Patroni's lag signal behaves during replay stalls.

`on-marked-down shutdown-sessions` prevents a connection from remaining attached after its node no longer satisfies that backend's role. That means a promoted replica drops from the read backend and joins the write backend; existing sessions are interrupted instead of silently continuing under a changed contract.

## Add database-side guardrails

PostgreSQL hot standbys reject writes while they are in recovery, but defense in depth makes a routing mistake easier to detect. Use a dedicated application role for read traffic and default its transactions to read-only:

```sql
CREATE ROLE app_read LOGIN;
ALTER ROLE app_read SET default_transaction_read_only = on;

CREATE ROLE app_write LOGIN;
```

Grant `app_read` only the object privileges it needs. `default_transaction_read_only` is not an authorization boundary for superusers or roles that can change it, so pair it with least-privilege grants. Do not give the read role table-write privileges merely because replicas currently reject writes.

Keep write and read connection pools distinct in the application. A pool created against the read address must never be borrowed for writes. Name them explicitly, export separate metrics, and make the query layer require the caller to choose a contract.

## Verify the endpoints from SQL

Test multiple fresh connections, because HAProxy selects a server at connection time:

```bash
for i in 1 2 3 4; do
  psql "host=postgres-read.example.net port=5001 dbname=app user=app_read" \
    -Atc "SELECT inet_server_addr(), pg_is_in_recovery(), current_setting('transaction_read_only')"
done

psql "host=postgres-write.example.net port=5000 dbname=app user=app_write" \
  -Atc "SELECT inet_server_addr(), pg_is_in_recovery(), current_setting('transaction_read_only')"
```

Every write result must be `pg_is_in_recovery() = false` and `transaction_read_only = off`. Every replica read result should be `true` and `on`. Alert if the write backend has zero eligible servers; alert at emergency severity if it ever has more than one.

Libpq offers another guard for clients that use multi-host connection strings: `target_session_attrs=read-write` accepts only a server that is not in hot standby and whose default transactions are writable. `target_session_attrs=standby` selects a hot standby, while `prefer-standby` falls back to any server. These checks protect new libpq connections; they do not replace Patroni-aware routing or move a live connection.

## Design for replica semantics

Read scaling is not transparent for every workload:

- Streaming replication is normally asynchronous, so a read immediately after a committed write can return older state on a replica.
- Long replica queries can conflict with WAL replay and be canceled. Increasing `max_standby_streaming_delay` transfers the cost to replication lag.
- A lag-in-bytes threshold does not directly express elapsed staleness or application consistency.
- Transactions cannot begin on a replica and later switch to the primary.
- Sequence observations, job claiming, locks, and read-modify-write operations usually belong on the write endpoint.

Use one of three explicit application policies: keep consistency-sensitive reads on the primary; pass a write LSN and wait for a replica to replay it; or accept bounded eventual consistency for designated views. Avoid a hidden "read/write splitter" that tries to classify arbitrary SQL text—functions, common table expressions, temporary objects, and transactions make that unreliable.

## Exclude an unhealthy replica without disabling promotion

Patroni's `noloadbalance: true` tag makes `/replica` return `503`, removing that node from a correctly configured read backend. It does not by itself prohibit promotion. This is useful for a replica undergoing expensive reporting, suffering read-path errors, or intentionally removed from application reads.

Conversely, `nofailover: true` controls promotion eligibility and does not remove the node from `/replica`. Set the two independently according to the node's purpose. Reload Patroni after changing local tags and verify both the REST status and `patronictl list` output.

## Test a role change

Use `patronictl switchover` for a planned test in a healthy cluster. Hold one connection open on each endpoint, switch roles, and observe the configured connection termination. Then open new sessions and verify SQL state again. The application should reconnect, retry only safe complete transactions, and direct consistency-sensitive work back to the write pool.

## Official Documentation

- [Patroni REST API health-check endpoints](https://patroni.readthedocs.io/en/latest/rest_api.html#health-check-endpoints)
- [Patroni YAML configuration and tags](https://patroni.readthedocs.io/en/latest/yaml_configuration.html)
- [HAProxy configuration manual](https://docs.haproxy.org/3.4/configuration.html)
- [PostgreSQL hot standby](https://www.postgresql.org/docs/current/hot-standby.html)
- [PostgreSQL libpq connection parameters](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-PARAMKEYWORDS)
- [PostgreSQL role configuration](https://www.postgresql.org/docs/current/sql-alterrole.html)
- [PostgreSQL monitoring statistics](https://www.postgresql.org/docs/current/monitoring-stats.html)

## Conclusion

Publish two endpoints, check Patroni's exact role on each backend, and verify the contract from SQL. Treat replica reads as explicitly stale-capable, keep read and write pools separate, and use database privileges plus read-only defaults as guardrails. A correct read/write split makes inconsistency choices visible instead of turning routing mistakes into production write failures.
