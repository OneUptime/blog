# Validation Summary: How to Handle Split-Brain Scenarios in Talos Linux

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Talos Linux (`talosctl` CLI, machine config, bond interfaces, VIP)
- etcd (Raft consensus, quorum, metrics)
- Kubernetes (Lease coordination API, `kubectl`, kube-state-metrics)
- Prometheus / Prometheus Operator (PrometheusRule CRD)
- PostgreSQL with Patroni (DCS configuration, synchronous replication)
- Python `kubernetes` client library
- Linux bonding (802.3ad / LACP)

## Sources Consulted
- Talos Linux docs — talosctl etcd subcommands and machine bond/VIP config: https://www.talos.dev/latest/reference/cli/ and https://www.talos.dev/latest/reference/configuration/v1alpha1/config/
- etcd metrics reference: https://etcd.io/docs/latest/metrics/ (`etcd_server_is_leader`, `etcd_server_proposals_failed_total`)
- Kubernetes coordination.k8s.io/v1 Lease API: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.34/#lease-v1-coordination-k8s-io
- Python `kubernetes` client (`CoordinationV1Api.read_namespaced_lease`): https://github.com/kubernetes-client/python
- Patroni configuration reference: https://patroni.readthedocs.io/en/latest/yaml_configuration.html
- PostgreSQL `synchronous_commit` and `synchronous_standby_names`: https://www.postgresql.org/docs/current/runtime-config-replication.html
- kube-prometheus / kube-state-metrics `kube_node_status_condition`: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/node-metrics.md

## Issues Found
- **Broken PrometheusRule expression for `EtcdLeaderDisagreement`.** The original query was `count(count by (leader_id) (etcd_server_is_leader == 0)) > 1`. This is incorrect for two reasons: (1) `etcd_server_is_leader` does not have a `leader_id` label (only the standard `instance`/`job` labels exported by Prometheus), and (2) filtering on `== 0` selects non-leaders rather than leaders. Replaced with `count(etcd_server_is_leader == 1) > 1`, which correctly fires when more than one etcd member reports itself as the Raft leader simultaneously (the actual split-brain symptom the alert is trying to detect). Updated the inline comment accordingly.

## Review Notes
- Patroni's `master_start_timeout` field is the legacy name. Patroni 3.0+ introduced `primary_start_timeout` as part of inclusive-language changes, but the legacy key still works for backward compatibility, so no edit was needed.
- The `network-health` DaemonSet example uses `getent hosts kubernetes.default.svc` inside a `for` loop, but that hostname resolves to a single ClusterIP rather than per-node addresses, so the loop only iterates once. It still functions as a basic API-server reachability probe (which is what the body of the loop tests), so it isn't technically broken — just narrower than the comment "between nodes" suggests. Left as-is to avoid altering the author's intent.
- The Lease example uses `renewTime: "2024-01-01T00:00:00Z"` as a placeholder; in practice this field is managed by the leader-election client and not set manually. This is fine for an illustrative snippet.
- `synchronous_commit: "on"` combined with `synchronous_standby_names: "*"` does cause writes to wait for at least one synchronous standby (in addition to the local WAL flush), so the post's claim about preventing data loss during failover is accurate.
- All `talosctl` subcommands shown (`etcd status`, `etcd members`, `etcd remove-member`, `reset --graceful`, `apply-config --insecure`) are valid against current Talos releases.
