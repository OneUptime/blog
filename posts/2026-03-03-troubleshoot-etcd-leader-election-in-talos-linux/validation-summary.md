# Validation Summary: How to Troubleshoot etcd Leader Election in Talos Linux

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Talos Linux
- talosctl
- etcd
- Raft leader election
- Prometheus and PrometheusRule alerting
- Kubernetes control plane operations

## Sources Consulted
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/latest/reference/cli
- Talos Linux configuration reference for `cluster.etcd.extraArgs` and `machine.time`: https://docs.siderolabs.com/talos/v1.11/reference/configuration/v1alpha1/config
- Talos Linux system volumes documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/system
- Talos Linux `VolumeConfig` reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/block/volumeconfig
- Talos Linux troubleshooting guide for etcd: https://www.talos.dev/v1.11/introduction/troubleshooting/
- etcd v3.6 metrics reference: https://etcd.io/docs/v3.6/metrics/
- etcd v3.6 tuning guide: https://etcd.io/docs/v3.6/tuning/
- etcd v3.5 failure modes documentation: https://etcd.io/docs/v3.5/op-guide/failures/
- etcd FAQ disk latency guidance: https://etcd.io/docs/v3.4/faq/
- Prometheus Operator API reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post described inconsistent leaders as a "split-brain" situation. etcd's Raft design prevents split-brain progress because only a majority partition can elect or keep a leader. I changed this to describe partitioned, transitioning, quorum-loss, or election-failure states.
- The network troubleshooting command comments said `talosctl get addresses` checked connectivity between nodes. That command lists node addresses, not peer reachability. I changed the comment and paired it with `talosctl get members` for cluster membership context.
- The Talos disk configuration example used `machine.disks` with a `/var/lib/etcd` mountpoint, which is not the current documented way to place Talos system storage. I replaced it with a `VolumeConfig` for the `EPHEMERAL` (`/var`) system volume, which contains `/var/lib/etcd` on control plane nodes.
- The timeout guidance said election timeout should be at least 5x round-trip time. etcd's tuning guide says election timeouts must be at least 10x RTT, with heartbeat interval close to average RTT and identical timeout settings across members. I updated the guidance accordingly.
- The split-brain recovery section claimed two partitions could elect their own leaders and might create data inconsistency. I changed it to quorum-loss/partition recovery language consistent with etcd's failure model.

## Review Notes
The remaining commands, PromQL metric names, Talos time configuration, etcd extra arguments, and PrometheusRule structure were consistent with the consulted official documentation. The guide intentionally uses representative thresholds for operational alerting; production thresholds may need adjustment for cluster size, storage class, and network topology.
