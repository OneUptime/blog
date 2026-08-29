# Validation Summary: Sizing and Placing an etcd Quorum for a Patroni Cluster

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- etcd 3.7, Raft quorum, learners, runtime membership, and disaster recovery
- Patroni 4.1.5 and its etcd v3 distributed configuration store integration
- PostgreSQL high availability, failover, fencing, and standby clusters
- YAML configuration and mutual TLS
- `etcdctl` 3.7.1 health, status, and membership commands
- Prometheus metrics for etcd

## Sources Consulted

- [etcd v3.7 FAQ](https://etcd.io/docs/v3.7/faq/)
- [etcd v3.7 tuning guidance](https://etcd.io/docs/v3.7/tuning/)
- [etcd v3.7 clustering guide](https://etcd.io/docs/v3.7/op-guide/clustering/)
- [etcd v3.7 configuration options](https://etcd.io/docs/v3.7/op-guide/configuration/)
- [etcd release-3.7 configuration-file sample](https://github.com/etcd-io/etcd/blob/release-3.7/etcd.conf.yml.sample)
- [etcd v3.7 runtime reconfiguration and learner guide](https://etcd.io/docs/v3.7/op-guide/runtime-configuration/)
- [etcd v3.7 failure modes](https://etcd.io/docs/v3.7/op-guide/failures/)
- [etcd v3.7 disaster recovery](https://etcd.io/docs/v3.7/op-guide/recovery/)
- [etcd v3.7 API guarantees](https://etcd.io/docs/v3.7/learning/api_guarantees/)
- [etcd v3.7 metrics overview](https://etcd.io/docs/v3.7/metrics/)
- [etcd v3.7 generated metrics list](https://etcd.io/docs/v3.7/metrics/etcd-metrics-latest/)
- [etcdctl release-3.7 command reference](https://github.com/etcd-io/etcd/blob/release-3.7/etcdctl/README.md)
- [etcd 3.7.1 official release](https://github.com/etcd-io/etcd/releases/tag/v3.7.1)
- [etcd 3.7 changelog](https://github.com/etcd-io/etcd/blob/release-3.7/CHANGELOG/CHANGELOG-3.7.md)
- [Patroni 4.1.5 YAML configuration](https://patroni.readthedocs.io/en/latest/yaml_configuration.html)
- [Patroni 4.1.5 dynamic configuration](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html)
- [Patroni DCS failsafe mode](https://patroni.readthedocs.io/en/latest/dcs_failsafe_mode.html)
- [Patroni REST API](https://patroni.readthedocs.io/en/latest/rest_api.html)
- [Patroni standby clusters](https://patroni.readthedocs.io/en/latest/standby_cluster.html)
- [Patroni multi-data-center HA guidance](https://patroni.readthedocs.io/en/latest/ha_multi_dc.html)
- [PostgreSQL 18 WAL and checkpoint guidance](https://www.postgresql.org/docs/current/wal-configuration.html)
- [PostgreSQL 18 high-availability and replication documentation](https://www.postgresql.org/docs/current/high-availability.html)

## Issues Found

- The five-member quorum row conflated two voting-member failures with two arbitrary failure-domain losses. It now states the exact voting-member tolerance; failure-domain tolerance still depends on placement.
- The proxy guidance treated one URL or virtual IP as inherently being a single point of failure. It now distinguishes a genuinely highly available service behind one stable address from one non-redundant proxy instance, path, or zone, and the failure-mode table uses the same distinction.
- The verification introduction said the example used Patroni's TLS path even though the commands use a separate administrator certificate. It now says the endpoints and network path are shared, requires trust in the same etcd CA, and explicitly notes that the commands do not test Patroni's client identity or RBAC permissions.
- The text claimed that table-formatted `etcdctl endpoint status` displays cluster IDs. It does not. The text now describes only information present across the status and membership tables: configured members, leader state, and applied indexes.
- Two metrics were given as shorthand names. They are now the exact exported names: `etcd_server_leader_changes_seen_total` and `etcd_server_has_leader`.
- The replacement procedure omitted `ETCD_NAME` from the values emitted by `etcdctl member add` and did not explicitly require matching local peer/TLS settings. The step now includes the name, cluster map, existing-cluster state, YAML equivalents, and matching local settings.
- The fourth-voter warning omitted etcd's default `strict-reconfig-check` protection. It now explains that the default check rejects this unsafe change and describes quorum stranding only when that protection is disabled.
- The `--force-new-cluster` warning incorrectly described the flag as discarding consensus history. It now follows the official recovery documentation: the flag overwrites membership while retaining application data and can panic if members of the previous cluster remain alive.
- The lost-quorum row ambiguously grouped reads and writes. It now states that writes and linearizable reads stop, reflecting that explicitly serializable reads may still return stale member-local data.

## Review Notes

- The YAML snippets parse successfully, and every shown etcd and Patroni field is current for etcd 3.7 and Patroni 4.1.5.
- The `etcdctl` commands and flag placement were exercised with the official 3.7.1 binary against a temporary local etcd instance; health, status, and member-list commands worked as written. Learner and promotion syntax was also checked against 3.7.1 command help.
- Patroni's default response to losing the DCS leader lock is demotion/read-only. If dynamic `failsafe_mode` is enabled, the existing primary may instead continue only while it can reach every known Patroni member over the REST API; no new leader election occurs without the DCS.
- etcd 3.7 removed its v2 client/request support. The post correctly uses Patroni's `etcd3` section; its v2/v3 key-visibility warning remains relevant when migrating older installations.
