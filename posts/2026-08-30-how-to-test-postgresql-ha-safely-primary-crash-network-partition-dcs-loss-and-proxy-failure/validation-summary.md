# Validation Summary: How to Safely Test PostgreSQL HA Failure Scenarios

## Status
validated

## Post Type
Operational high-availability testing guide

## Technologies Covered
- PostgreSQL
- Patroni
- etcd and Raft quorum
- HAProxy
- Keepalived and virtual IP failover
- PgBouncer
- PostgreSQL streaming and synchronous replication

## Sources Consulted
- [Patroni `patronictl` reference](https://patroni.readthedocs.io/en/latest/patronictl.html)
- [Patroni dynamic configuration and failover timing](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html)
- [Patroni DCS failsafe mode](https://patroni.readthedocs.io/en/latest/dcs_failsafe_mode.html)
- [Patroni REST API and role-aware health endpoints](https://patroni.readthedocs.io/en/latest/rest_api.html)
- [Patroni YAML configuration](https://patroni.readthedocs.io/en/latest/yaml_configuration.html)
- [Patroni watchdog support](https://patroni.readthedocs.io/en/latest/watchdog.html)
- [Patroni replication modes](https://patroni.readthedocs.io/en/latest/replication_modes.html)
- [etcd cluster-status commands](https://etcd.io/docs/v3.7/tasks/operator/how-to-check-cluster-status/)
- [etcd quorum and failure-tolerance FAQ](https://etcd.io/docs/v3.7/faq/)
- [etcd failure modes](https://etcd.io/docs/v3.7/op-guide/failures/)
- [etcd runtime reconfiguration](https://etcd.io/docs/v3.7/op-guide/runtime-configuration/)
- [etcd API guarantees](https://etcd.io/docs/v3.7/learning/api_guarantees/)
- [HAProxy health checks](https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/)
- [HAProxy configuration reference for `fall` and `on-marked-down shutdown-sessions`](https://docs.haproxy.org/3.2/configuration.html#5.2-on-marked-down)
- [Keepalived configuration reference](https://keepalived.org/documentation/keepalived-conf/)
- [PostgreSQL recovery information functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-RECOVERY-CONTROL)
- [PostgreSQL transaction read-only settings](https://www.postgresql.org/docs/current/runtime-config-client.html)
- [PostgreSQL date/time functions](https://www.postgresql.org/docs/current/functions-datetime.html)
- [PostgreSQL commit-timestamp functions](https://www.postgresql.org/docs/current/functions-info.html#FUNCTIONS-COMMIT-TIMESTAMP)
- [PostgreSQL WAL durability settings](https://www.postgresql.org/docs/current/runtime-config-wal.html)
- [PostgreSQL warm standby and failover](https://www.postgresql.org/docs/current/warm-standby-failover.html)
- [PostgreSQL timelines](https://www.postgresql.org/docs/current/continuous-archiving.html#BACKUP-TIMELINES)
- [PostgreSQL replication monitoring views](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-REPLICATION-VIEW)
- [PostgreSQL `pg_rewind`](https://www.postgresql.org/docs/current/app-pgrewind.html)
- [PostgreSQL frontend/backend protocol termination behavior](https://www.postgresql.org/docs/current/protocol-flow.html#PROTOCOL-FLOW-TERMINATION)
- [PostgreSQL libpq connection and transaction status](https://www.postgresql.org/docs/current/libpq-status.html)
- [PgBouncer failover FAQ](https://www.pgbouncer.org/faq.html#how-to-failover)
- [PgBouncer console commands and `SHOW SERVERS`](https://www.pgbouncer.org/usage)
- [PgBouncer configuration reference](https://www.pgbouncer.org/config)

## Issues Found
1. **The writable-node evidence treated `transaction_read_only` as a server-wide fencing signal.** That setting reflects the current session or transaction and can be true on a primary. The evidence now requires repeated, near-simultaneous `pg_is_in_recovery()` checks on every member and uses `transaction_read_only` only as a session-level cross-check.
2. **“One Patroni leader” was stated as a continuous invariant.** A healthy failover interval can temporarily have no leader, and DCS evidence can be unavailable during a DCS outage while failsafe mode permits the existing primary to continue. The invariant now says at most one Patroni leader and requires exactly one after recovery, using direct REST evidence during DCS loss and DCS evidence only when reachable.
3. **The canary row was described as containing a commit timestamp.** An actual PostgreSQL commit timestamp is available only after commit, and built-in commit-timestamp tracking has separate configuration and retention constraints. The post now calls this an attempt timestamp.
4. **The reconciliation procedure considered only acknowledged operations.** That cannot resolve attempts whose outcome became unknown around `COMMIT`, and a newly generated ID on each retry cannot prevent a semantic duplicate. The post now requires a stable operation ID enforced by a unique constraint, records every attempt and client outcome, and reconciles all attempted IDs while separately asserting that every acknowledged ID is present.
5. **The captured settings omitted effective commit-durability controls.** Patroni synchronous mode does not by itself determine the durability of a canary transaction because `synchronous_commit` can vary by session or transaction. The post now also captures the canary session's `synchronous_commit`, the live `synchronous_standby_names`, and `fsync`.
6. **The HAProxy wording called `/primary` a backend.** `/primary` is Patroni's role-aware REST health-check path. The post now says HAProxy marks the former primary backend down based on that health check.
7. **The etcd quorum-loss step said to “remove” a second member.** In etcd, member removal is a persistent membership operation, not a reversible process fault, and conflicts with the instruction to restore the original member and data. The step now stops a second member and later restarts the same stopped processes with their original data directories.
8. **Patroni REST port `8008` was presented as fixed.** The REST listener is configurable; `8008` is a common/default generated value. The post now instructs the operator to block the configured Patroni REST port.
9. **The PgBouncer check assumed a route change was sufficient to move existing pooled server connections.** Existing server connections can outlive an HAProxy route change depending on pooling and drain behavior. The post now requires the configured drain or invalidation action and a backend-identity query through each active pool.
10. **The final assertion was limited to one primary on the “current timeline.”** A writable former primary on a divergent timeline would violate safety while evading that wording. The final checks now require exactly one member out of recovery and writable, with every intended replica in recovery and following the elected primary's timeline history.

## Review Notes
- The two `patronictl` commands and the `etcdctl endpoint status --cluster --write-out=table` command are valid current syntax.
- Patroni's documented worst-case primary-crash timing formula and the special `primary_start_timeout = 0` case are accurate.
- The Patroni DCS failsafe description, etcd three-member quorum behavior, HAProxy `fall` behavior, and `on-marked-down shutdown-sessions` semantics are accurate.
- The ambiguous-`COMMIT`, PostgreSQL timeline, replication monitoring, and conditional `pg_rewind` explanations are accurate.
- The linked etcd v3.7 documentation is the current stable documentation as of the validation date. The PostgreSQL `current` links resolve to PostgreSQL 18, and the Patroni `latest` links resolve to Patroni 4.1.5.
- `patronictl show-config` reports dynamic configuration stored in the DCS; node-local settings such as watchdog mode still need to be captured separately on each member, as the post instructs.
