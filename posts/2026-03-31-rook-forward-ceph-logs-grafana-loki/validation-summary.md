# Validation Summary: How to Forward Ceph Logs to Grafana Loki

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Grafana Loki (log aggregation)
- Promtail (log collection agent)
- Grafana (dashboarding/visualization)
- LogQL (Loki query language)
- Kubernetes (DaemonSet, ConfigMap, service discovery)

## Sources Consulted
- Grafana Promtail documentation: https://grafana.com/docs/loki/latest/clients/promtail/
- Promtail Helm chart default scrape config: https://github.com/grafana/helm-charts/tree/main/charts/promtail
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/api/#push-log-entries-to-loki
- LogQL documentation: https://grafana.com/docs/loki/latest/logql/
- Kubernetes API meta labels for service discovery: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#pod
- Rook Ceph pod labeling conventions: https://rook.io/docs/rook/latest/

## Issues Found
1. **Missing `__path__` relabel config in Promtail scrape config (critical):** The `relabel_configs` section did not include a rule to set the `__path__` label, which tells Promtail where on disk to find container log files. Without this, Promtail discovers Ceph pods via Kubernetes SD but tails zero log files because it has no file path to read. Added the standard `__path__` relabel rule mapping `__meta_kubernetes_pod_uid` and `__meta_kubernetes_pod_container_name` to `/var/log/pods/*$1/$2/*.log`.

## Review Notes
- The Promtail image `grafana/promtail:2.9.0` is functional but dated. Grafana now recommends Grafana Alloy as the successor to Promtail for new deployments. The post could note this in a future update.
- The DaemonSet does not define a ServiceAccount or RBAC resources (ClusterRole, ClusterRoleBinding). Kubernetes service discovery requires permissions to list/watch pods. Readers will need to create appropriate RBAC resources or use an existing service account with sufficient permissions.
- The `/var/lib/docker/containers` volume mount is only relevant for Docker runtime. Since the config uses the `cri: {}` pipeline stage (targeting containerd/CRI-O), this mount is unnecessary but harmless. For CRI runtimes, logs reside under `/var/log/pods/` which is covered by the `/var/log` mount.
- All LogQL queries use valid syntax compatible with Loki 2.0+.
