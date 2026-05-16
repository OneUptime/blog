# Validation Summary: How to Handle Control Plane Failover in Talos Linux

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Talos Linux (talosctl, machine configuration, VIP)
- Kubernetes (kube-apiserver, kube-controller-manager, kube-scheduler)
- etcd (heartbeat/election tuning, leader election, disaster recovery)
- Prometheus / kube-prometheus (PrometheusRule, alerting)

## Sources Consulted
- Talos v1.8 CLI reference: https://docs.siderolabs.com/talos/v1.8/reference/cli/
- Talos v1alpha1 machine configuration schema: https://docs.siderolabs.com/talos/v1.8/reference/configuration/v1alpha1/config
- Talos VIP documentation: https://www.talos.dev/v1.8/talos-guides/network/vip/
- Talos etcd disaster recovery: https://www.talos.dev/v1.8/advanced/disaster-recovery/
- kube-apiserver flag reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- kube-controller-manager flag reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- kube-scheduler flag reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-scheduler/
- etcd tuning guide: https://etcd.io/docs/v3.5/tuning/
- Kubernetes leader election metrics source: https://github.com/kubernetes/component-base/blob/master/metrics/prometheus/clientgo/leaderelection/metrics.go

## Issues Found

1. **kube-apiserver leader-election flags are not real.** The original `apiServer.extraArgs` block configured `--leader-elect-lease-duration`, `--leader-elect-renew-deadline`, and `--leader-elect-retry-period`. kube-apiserver is stateless and runs active/active behind a load balancer; these flags exist only on kube-controller-manager and kube-scheduler. Removed the entire `apiServer` block from the example config patch.

2. **`talosctl boot` does not exist.** The Test 3 step under "Testing Failover" called `talosctl boot --nodes 192.168.1.11`. Talos provides `reboot`, `shutdown`, `reset`, and `bootstrap`, but no `boot` subcommand — a powered-off node must be brought up externally (hypervisor, BMC, IPMI, etc.). Replaced the bogus command with a comment instructing the operator to power the node on through their hypervisor/BMC.

3. **Inaccurate etcd timeout ratio.** The post stated "The election timeout must be at least 5 times the heartbeat interval." Etcd's official tuning guide actually anchors both values to round-trip time (RTT): heartbeat ~RTT, election timeout ≥ 10× RTT (roughly 10× the heartbeat). Reworded the sentence to reflect etcd's actual guidance.

4. **`rate()` used on a gauge metric.** The `LeaderElectionDuration` alert used `rate(leader_election_master_status[5m]) > 0.1`. `leader_election_master_status` is a binary gauge (0/1), so `rate()` is semantically meaningless on it. Switched to `changes(leader_election_master_status[5m]) > 2`, which correctly counts how many times the gauge value flipped in the window.

## Review Notes

- All other talosctl invocations (`apply-config --insecure`, `etcd remove-member`, `etcd members`, `etcd status`, `bootstrap --recover-from`, `reboot`, `shutdown`, `get addresses`) and Talos machine config paths (`cluster.etcd.extraArgs`, `cluster.controllerManager.extraArgs`, `cluster.scheduler.extraArgs`, `machine.network.interfaces[].vip.ip`) check out against the v1.8 reference.
- The `EtcdQuorumAtRisk` rule (`count(etcd_server_has_leader == 1) < 2`) is correct as a quorum-loss alert for a 3-member cluster, though strictly speaking it fires once quorum is already lost rather than "at risk." Left as-is — the semantics match the intent of detecting unhealthy etcd.
- For etcd-specific leader-churn detection, `rate(etcd_server_leader_changes_seen_total[15m])` would be a complementary alert worth considering in future revisions.
- Sidero's preferred path for removing a *healthy* leaving member is `talosctl etcd leave`; `remove-member` (used in the post) is the right call for failed members, so the example is fine in context.
