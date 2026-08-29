# Validation Summary: Why Patroni's HAProxy Health Check Returns 503

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Patroni 4.1.5 REST API, leader election, DCS integration, standby clusters, pause mode, and DCS failsafe mode
- PostgreSQL physical replication, timelines, WAL receive/replay positions, and role transitions
- HAProxy 3.4 HTTP health checks in a TCP backend, health-check thresholds, Runtime API, and connection handling
- etcd and `etcdctl` v3 endpoint health/status commands with mutual TLS
- PgBouncer connection pooling behavior during downstream failover
- `curl`, `jq`, `journalctl`, and `socat`

## Sources Consulted

- [Patroni 4.1.5 REST API documentation](https://patroni.readthedocs.io/en/latest/rest_api.html)
- [Patroni 4.1.5 REST API implementation](https://github.com/patroni/patroni/blob/v4.1.5/patroni/api.py)
- [Patroni 4.1.5 HA implementation](https://github.com/patroni/patroni/blob/v4.1.5/patroni/ha.py)
- [Patroni DCS failsafe mode](https://patroni.readthedocs.io/en/latest/dcs_failsafe_mode.html)
- [Patroni dynamic configuration settings](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html)
- [Patroni YAML configuration settings](https://patroni.readthedocs.io/en/latest/yaml_configuration.html)
- [Patroni FAQ: DCS namespace, scope, and system identifier](https://patroni.readthedocs.io/en/latest/faq.html#dcs)
- [Patroni `patronictl` reference](https://patroni.readthedocs.io/en/latest/patronictl.html)
- [Patroni standby-cluster documentation](https://patroni.readthedocs.io/en/latest/standby_cluster.html)
- [Patroni multi-datacenter failover guidance](https://patroni.readthedocs.io/en/latest/ha_multi_dc.html)
- [PostgreSQL documentation: timelines](https://www.postgresql.org/docs/current/continuous-archiving.html#BACKUP-TIMELINES)
- [HAProxy 3.4 configuration manual](https://docs.haproxy.org/3.4/configuration.html)
- [HAProxy 3.4 management guide and Runtime API](https://docs.haproxy.org/3.4/management.html)
- [HAProxy health-check tutorial](https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/)
- [etcd cluster-status tutorial](https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/)
- [etcd v3.7 monitoring guide](https://etcd.io/docs/v3.7/op-guide/monitoring/)
- [Official `etcdctl` endpoint-command reference](https://github.com/etcd-io/etcd/blob/main/etcdctl/README.md#endpoint-subcommand)
- [PgBouncer command reference](https://www.pgbouncer.org/usage)
- [PgBouncer configuration reference](https://www.pgbouncer.org/config)

## Issues Found

- The post treated `/primary` as an independent PostgreSQL process-health test. Patroni's documentation describes a running primary with the leader lock, but the 4.1.5 implementation returns `200` in a normal cluster from Patroni's current internal leader state without separately requiring PostgreSQL `state=running` or rechecking the reported role. The opening, endpoint table, and status-combination table now distinguish retained leader state from PostgreSQL health and direct readers to `/health` or `/patroni` for the latter.
- The `/synchronous`, `/quorum`, and `/asynchronous` rows omitted inherited replica eligibility. They now state that `state=running`, replica role, absence of an active `noloadbalance` tag, applicable lag/tag filters, and the requested replication classification must all qualify.
- The liveness row omitted pause mode and described the longer threshold only as applying to replicas. It now records that pause mode returns `200`, and that the stale-loop threshold is `ttl` for a running primary and `2 * ttl` for other members.
- The readiness row did not identify its supported `lag` and `mode=apply|write` parameters or defaults. It now records the `maximum_lag_on_failover` and apply/replay defaults and the streaming/lag prerequisites.
- Replica lag was described as receive or replay lag. Patroni 4.1.5's `/replica?lag=...` and `/async?lag=...` selectors compare the leader position with `xlog.replayed_location`; receive/write lag is selected by `/readiness?mode=write`. The endpoint table and troubleshooting bullet were corrected, including the fact that equality with the limit is accepted.
- `cluster_unlocked: true` was treated as conclusive evidence that no primary could continue. Under active DCS failsafe, the local DCS view may be unlocked while the existing primary retains leader state as long as all known members acknowledge it. The post now explains this exception, notes that `failsafe_mode_is_active` can differ transiently between members, and makes DCS restoration conditional on the health checks actually showing quorum or latency failure.
- The post called `scope` a DCS namespace. Patroni defines `namespace` and `scope` separately and forms its DCS key prefix from both. The cluster-separation explanation was corrected accordingly, and the `/patroni` projection now includes `database_system_identifier` for the comparison the post recommends.
- The HAProxy log explanation attributed every Layer 7 `503` directly to Patroni. HAProxy can establish only that its configured HTTP check target returned `503`; a reverse proxy could be that target. The text now attributes the response to Patroni only when port `8008` is the direct Patroni listener.
- The HAProxy four-to-six-second detection estimate was valid only for promptly completed failures such as an HTTP `503`. The post now states that connection or response timeouts can take longer and depend on check timeout settings.
- Existing HAProxy connections were described as categorically unaffected. That is the default, but `on-marked-down shutdown-sessions` terminates existing streams when a server is marked down. The exception is now explicit.
- The remediation table assumed that a missing DCS leader necessarily meant lost DCS quorum, overlooked the configured `rise` hysteresis after a direct `200`, and treated `/leader=200` plus `/primary=503` as inherently broken. Those rows now require checking DCS/candidate state, allow for `rise`, and recognize standby-cluster or pause-mode cases.
- The fencing sentence applied to every manual promotion and referred to selecting an authoritative timeline. A normal Patroni-coordinated switchover does not require separate operator fencing, and operators promote a candidate rather than a timeline number. The warning is now scoped to no-leader or partitioned recovery and requires fencing the former primary and choosing the authoritative candidate from timeline history and WAL positions.

## Review Notes

- The HAProxy configuration uses valid, current 3.4 syntax. The explicit `http-check connect` and `http-check send` forms are available in HAProxy 2.2 and newer.
- The three `patronictl` commands, both `etcdctl` commands, all shown TLS flags, the HAProxy configuration-validation command, and the Runtime API `socat` command are valid.
- Combining explicit etcd endpoints with `--cluster` is accepted but redundant: the listed endpoints act as seeds, while `--cluster` discovers and checks advertised member client URLs. Those advertised URLs must be reachable and valid for TLS from the troubleshooting host.
- Patroni's current master branch adds a `/replica?replication_state=...` selector that is not present in the reviewed 4.1.5 release. The post does not depend on that unreleased/version-specific selector.
