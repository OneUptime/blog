# Validation Summary: How to Build a Three-Node PostgreSQL HA Cluster with Patroni, etcd, and HAProxy

## Status
validated

## Post Type
Technical tutorial and deployment guide

## Technologies Covered

- PostgreSQL 18, physical streaming replication, hot standby, SCRAM authentication, TLS, and `pg_rewind`
- Patroni 4.1.5, including DCS configuration, REST health checks, switchover, reinitialization, and watchdog fencing
- etcd 3.7, including static cluster bootstrap, quorum, mTLS, runtime membership, and disaster recovery
- HAProxy 3.4 TCP proxying and HTTP health checks
- Linux systemd and watchdog devices

## Sources Consulted

- [Patroni installation](https://patroni.readthedocs.io/en/latest/installation.html)
- [Patroni YAML configuration settings](https://patroni.readthedocs.io/en/latest/yaml_configuration.html)
- [Patroni dynamic configuration settings](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html)
- [Patroni REST API](https://patroni.readthedocs.io/en/latest/rest_api.html)
- [Patroni security considerations](https://patroni.readthedocs.io/en/latest/security.html)
- [Patroni watchdog support](https://patroni.readthedocs.io/en/latest/watchdog.html)
- [Patroni `patronictl` reference](https://patroni.readthedocs.io/en/latest/patronictl.html)
- [etcd 3.7 configuration options](https://etcd.io/docs/v3.7/op-guide/configuration/)
- [etcd 3.7 clustering guide](https://etcd.io/docs/v3.7/op-guide/clustering/)
- [etcd 3.7 transport security model](https://etcd.io/docs/v3.7/op-guide/security/)
- [etcd FAQ and quorum guidance](https://etcd.io/docs/v3.7/faq/)
- [etcd member add/remove procedure](https://etcd.io/docs/v3.7/tasks/operator/how-to-deal-with-membership/)
- [etcd disaster recovery](https://etcd.io/docs/v3.7/op-guide/recovery/)
- [etcdctl 3.7.1 reference](https://github.com/etcd-io/etcd/blob/v3.7.1/etcdctl/README.md)
- [PostgreSQL 18 `initdb`](https://www.postgresql.org/docs/18/app-initdb.html)
- [PostgreSQL 18 `pg_rewind`](https://www.postgresql.org/docs/18/app-pgrewind.html)
- [PostgreSQL 18 WAL settings](https://www.postgresql.org/docs/18/runtime-config-wal.html)
- [PostgreSQL 18 `pg_hba.conf`](https://www.postgresql.org/docs/18/auth-pg-hba-conf.html)
- [PostgreSQL 18 password authentication](https://www.postgresql.org/docs/18/auth-password.html)
- [PostgreSQL 18 server TLS](https://www.postgresql.org/docs/18/ssl-tcp.html)
- [PostgreSQL 18 libpq TLS verification](https://www.postgresql.org/docs/18/libpq-ssl.html)
- [PostgreSQL 18 hot standby behavior](https://www.postgresql.org/docs/18/hot-standby.html)
- [PostgreSQL 18 frontend/backend protocol overview](https://www.postgresql.org/docs/18/protocol-overview.html)
- [PostgreSQL 18 libpq connection status](https://www.postgresql.org/docs/18/libpq-status.html)
- [PostgreSQL 18 replication statistics](https://www.postgresql.org/docs/18/monitoring-stats.html)
- [PostgreSQL 18 administration functions](https://www.postgresql.org/docs/18/functions-admin.html)
- [HAProxy 3.4 configuration manual](https://docs.haproxy.org/3.4/configuration.html)

## Issues Found

- The firewall prerequisite called the example's etcd client traffic authenticated even though the shown HTTP lab configuration enables neither etcd authentication nor client certificates. Removed that qualifier; the production mTLS instructions remain separate.
- The etcd copy instruction ambiguously said to change “both node-specific addresses,” even though the local address occurs in four fields and the cluster-wide member list must remain identical. Named the four local fields explicitly and stated which bootstrap fields must not change.
- The production etcd TLS guidance did not name the settings that enable client and peer certificate authentication, and it omitted Patroni's required `etcd3.protocol: https`. Added the exact etcd mTLS and Patroni client settings.
- The etcd failure table did not distinguish a transient outage from permanent member loss or state the safe remove-before-add sequence. It now directs operators to restart transient failures, remove a permanently failed member before adding its replacement, and start the replacement with `initial-cluster-state: existing`.
- The quorum-loss response was too vague for permanent loss of two members. It now distinguishes recovering an original member from restoring a new cluster with `etcdutl`; runtime membership changes cannot repair a quorumless cluster.
- The `pg_rewind` explanation implied that data checksums and `wal_log_hints` both act independently when both are enabled. It now states the documented either/or prerequisite and explains that PostgreSQL ignores `wal_log_hints` while checksums are enabled.
- The routing language implied HAProxy continuously enforces a backend's role. Health checks select backends for new connections, while existing hot-standby sessions can survive promotion and later become read-write. Qualified the routing claims, documented that port `5001` is not an authorization boundary, and made the post-switchover verification explicitly use a fresh connection.
- The blanket instruction to retry an entire transaction after any disconnect was unsafe because a disconnect during commit can leave the outcome unknown. It now permits a retry only when the transaction is known not to have committed or when idempotency/deduplication makes an unknown outcome safe.
- The final `psql` command used an `app` role that the tutorial never creates. Added the explicit prerequisite that this login role must already exist and have access to the `postgres` database.

## Review Notes

- The Patroni YAML, etcd YAML, HAProxy configuration, shell commands, `patronictl` syntax, and SQL queries are current for Patroni 4.1.5, etcd 3.7.1, HAProxy 3.4, and PostgreSQL 18.
- PostgreSQL 18 enables data checksums by default, but the explicit Patroni `data-checksums` bootstrap option is valid.
- The example uses asynchronous replication because it does not enable Patroni synchronous mode. An unplanned failover can therefore lose acknowledged transactions; the post does not claim zero-data-loss failover.
- The clear-text etcd and Patroni REST snippets remain intentionally lab-only, with production TLS requirements called out in the post.
- All reference links in the post resolved successfully during validation.
