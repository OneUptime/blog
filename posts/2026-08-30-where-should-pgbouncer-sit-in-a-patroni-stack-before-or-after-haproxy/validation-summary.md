# Validation Summary: Where Should PgBouncer Sit in a Patroni Stack: Before or After HAProxy?

## Status

validated

## Post Type

Technical architecture guide / operational failover guide

## Technologies Covered

- PostgreSQL high availability, recovery state, and connection semantics
- Patroni 4.1.5 role management and REST health endpoints
- PgBouncer 1.25.2 connection pooling and administration commands
- HAProxy 3.4 TCP routing, multi-step health checks, and runtime state
- SCRAM-SHA-256 authentication
- Planned switchovers and unplanned failovers

## Sources Consulted

- [Patroni REST API](https://patroni.readthedocs.io/en/latest/rest_api.html)
- [Patroni dynamic configuration](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html)
- [Patroni replication modes](https://patroni.readthedocs.io/en/latest/replication_modes.html)
- [PgBouncer features and pooling-mode SQL feature map](https://www.pgbouncer.org/features.html)
- [PgBouncer configuration reference](https://www.pgbouncer.org/config.html)
- [PgBouncer administration commands](https://www.pgbouncer.org/usage.html)
- [PgBouncer failover and prepared-statement FAQ](https://www.pgbouncer.org/faq.html)
- [PgBouncer changelog](https://www.pgbouncer.org/changelog.html)
- [HAProxy 3.4 configuration manual](https://docs.haproxy.org/3.4/configuration.html)
- [HAProxy health-check documentation](https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/)
- [HAProxy 3.4 management guide and Runtime API](https://docs.haproxy.org/3.4/management.html)
- [PostgreSQL hot standby](https://www.postgresql.org/docs/current/hot-standby.html)
- [PostgreSQL system information functions](https://www.postgresql.org/docs/current/functions-info.html)
- [PostgreSQL recovery information functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-RECOVERY-INFO-TABLE)
- [PostgreSQL `SET`](https://www.postgresql.org/docs/current/sql-set.html)
- [PostgreSQL `LISTEN`](https://www.postgresql.org/docs/current/sql-listen.html)
- [PostgreSQL SQL-level `PREPARE`](https://www.postgresql.org/docs/current/sql-prepare.html)
- [PostgreSQL advisory locks](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS)

## Issues Found

1. **HAProxy startup could expose unchecked nodes** - The backend did not set an initial server state. HAProxy could therefore make a server eligible before its first role check. Added `init-state fully-down` so a node must complete the combined role-and-listener check successfully twice (`rise 2`) before receiving writer traffic.
2. **Node-local placement was claimed to eliminate old-primary connections** - Closing HAProxy-to-PgBouncer streams does not directly close PgBouncer's separate server sockets to local PostgreSQL. Reworded the description and failover explanation to state the actual guarantee: after HAProxy marks the node down, those local sockets may remain but are no longer reachable through the writer path.
3. **Patroni and HAProxy failover timing was too immediate** - `/primary` requires both PostgreSQL-primary state and the Patroni leader lock, and `shutdown-sessions` runs only after HAProxy marks the server down. Clarified loss of the leader lock and the configured three-failure threshold.
4. **Central placement omitted HAProxy's automatic invalidation option** - A Patroni-aware central HAProxy backend can also use `on-marked-down shutdown-sessions` to terminate PgBouncer server streams pinned to the former primary. Added this alternative so the post no longer implies that an unplanned central failover inherently requires PgBouncer administration commands.
5. **`SHOW SERVERS` was said to reveal the PostgreSQL destination behind HAProxy** - In the central topology, its `addr` field is the immediate HAProxy peer, not HAProxy's selected PostgreSQL member. Corrected the explanation, added `WAIT_CLOSE app` for proving marked PgBouncer sockets closed, and directed backend verification to runtime stream state on every HAProxy instance.
6. **The planned-switchover runbook addressed only one central PgBouncer** - PgBouncer administration state is process-local. Changed the runbook to pause and resume `app` on every central pooler and to wait for every `PAUSE` command to finish before switching the primary.
7. **Pool-budget scope was ambiguous** - `default_pool_size` and `reserve_pool_size` apply per user/database pair, while `max_client_conn` applies per PgBouncer process. Changed the guidance to budget all possible pools and reserve capacity on each node against that node's PostgreSQL connection limit.
8. **Transaction-pooling restrictions were overbroad** - PgBouncer can preserve tracked parameters, and temporary state dropped at commit does not have the same cross-transaction problem as persistent temporary state. Qualified the warning to untracked session `SET`/`RESET` values and temporary state that persists past commit, while retaining the valid warnings for `LISTEN`, SQL-level prepared statements, and session advisory locks.
9. **The SQL query was described as an end-to-end write-path proof** - The query validly reports recovery and transaction-read-only state, but it does not prove Patroni leadership or a successful application write. Also, `inet_server_addr()` normally returns `127.0.0.1` on every node with the shown loopback PgBouncer destination. Recast it as a necessary session-state check and retained the need for a rollback-safe application-level write probe.
10. **Reconnect wording was absolute** - A planned `PAUSE` can preserve client connections, whereas `KILL` or failed active streams disconnect them. Changed the conclusion to require applications to be prepared to reconnect after connection loss and to retry only transactions that are safe to repeat.
11. **HAProxy backend-selection terminology was imprecise** - HAProxy relays existing streams but chooses a backend server when establishing a new stream's server side; it does not choose a whole backend or migrate an established stream. Corrected the two explanations and the conclusion accordingly.

## Review Notes

- Both PgBouncer configuration fragments use valid current option names and values. The referenced authentication file still needs entries with suitable credentials for application, administration, and statistics users.
- The exact HAProxy multi-step check was validated against the HAProxy 3.4 documentation and accepted by an HAProxy 3.4.0 configuration syntax check. Its final bare `http-check connect port 6432` is intentionally a Layer-4 listener check.
- `init-state` is available in HAProxy 3.1 and later; the post links to and was validated against HAProxy 3.4.
- PgBouncer protocol-level named prepared-statement tracking was introduced in 1.21.0. `max_prepared_statements` has defaulted to `200` since 1.24.0 and is nonzero in current PgBouncer 1.25.2.
- If redundant central PgBouncers are themselves behind a load balancer, PgBouncer peering may be needed so PostgreSQL cancellation requests routed to a different PgBouncer process can reach the process that owns the query.
- The ambiguous-commit warning and the instruction to retry only safe transactions are correct. Patroni's asynchronous failover modes do not provide an unconditional zero-data-loss guarantee.
- The author profile and all seven documentation links already present in the post returned successfully during validation.
