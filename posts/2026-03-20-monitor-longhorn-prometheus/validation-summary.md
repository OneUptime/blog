# Validation Summary: How to Monitor Longhorn with Prometheus - Monitor

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Longhorn (cloud-native distributed block storage for Kubernetes)
- Prometheus (metrics collection)
- Prometheus Operator / kube-prometheus-stack (ServiceMonitor, PrometheusRule CRDs)
- Kubernetes (kubectl, ConfigMaps, Service Discovery)
- PromQL (Prometheus Query Language)

## Sources Consulted
- [Longhorn Monitoring Metrics docs (1.6.0)](https://longhorn.io/docs/1.6.0/monitoring/metrics/)
- [Longhorn Monitoring Metrics docs (1.7.0)](https://longhorn.io/docs/1.7.0/monitoring/metrics/)
- [Longhorn Node Conditions docs](https://longhorn.io/docs/1.10.0/nodes-and-volumes/nodes/node-conditions/)
- [Longhorn Prometheus support enhancement proposal](https://fossies.org/linux/longhorn/enhancements/20200909-prometheus-support.md)
- [Prometheus Operator ServiceMonitor CRD docs](https://prometheus-operator.dev/docs/operator/api/)

## Issues Found

Several PromQL queries and metric names referenced metrics that do not exist in Longhorn's actual exposed metrics. All issues have been corrected:

1. **Non-existent disk metrics replaced.** The post originally used `longhorn_disk_storage_available_bytes` and `longhorn_disk_storage_maximum_bytes`, neither of which are exposed by Longhorn. Replaced with the actual disk metrics: `longhorn_disk_capacity_bytes` (total capacity) and `longhorn_disk_usage_bytes` (used storage). The "available" calculation is now `longhorn_disk_capacity_bytes - longhorn_disk_usage_bytes`, and the percentage queries were rewritten accordingly. This affected the "Disk Capacity" PromQL section and the `LonghornDiskStorageLow` / `LonghornDiskStorageCritical` alert expressions.

2. **Non-existent manager metrics replaced in overview table.** The metric overview table referenced `longhorn_manager_volume_count` and `longhorn_manager_backup_count`, which are not part of Longhorn's metrics. Replaced with the actual manager metrics: `longhorn_manager_cpu_usage_millicpu` and `longhorn_manager_memory_usage_bytes`.

3. **Non-existent total volume count metric replaced.** The "Volume Health" section used `longhorn_manager_volume_count_total`, which does not exist. Replaced with `count(longhorn_volume_state)`, which correctly counts the number of volumes from the per-volume state metric.

4. **Incorrect condition label casing fixed.** The post used `condition="Schedulable"` (capitalized), but Longhorn's `longhorn_node_status` metric uses lowercase condition values: `ready`, `schedulable`, `mountpropagation`, `allowScheduling`. Changed to `condition="schedulable"` in both the "Node Status" PromQL section and the `LonghornNodeNotSchedulable` alert.

5. **Overview table improvements.** Added `longhorn_volume_robustness` to the Volume row and `longhorn_node_storage_capacity_bytes` to the Node row, plus `longhorn_disk_reservation_bytes` to the Disk row, since these are commonly used metrics worth surfacing.

## Review Notes

- The `longhorn_volume_robustness` value mapping in the post (2 = degraded, 3 = faulted) matches the official documentation (0=unknown, 1=healthy, 2=degraded, 3=faulted).
- The ServiceMonitor configuration is structurally correct. The `app: longhorn-manager` selector matches the Longhorn manager Service in the `longhorn-system` namespace, and `port: manager` is the correct named port.
- The static scrape config using `kubernetes_sd_configs` with `role: endpoints` and the relabel rules to keep only `longhorn-manager` endpoints with the `manager` named port is valid Prometheus configuration.
- The "available bytes" calculations now use disk capacity minus usage. For more precision, users may also subtract `longhorn_disk_reservation_bytes` since Longhorn reserves storage for system use, but the simpler form is acceptable for alerting thresholds.
- The post does not pin a specific Longhorn version. Metric names referenced are consistent with Longhorn 1.5+ (current stable releases through 1.7).
