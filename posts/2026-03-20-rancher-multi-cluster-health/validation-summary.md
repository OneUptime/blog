# Validation Summary: How to Monitor Multi-Cluster Health from Rancher Dashboard - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Fleet
- Prometheus
- Prometheus Operator
- Alertmanager
- Grafana
- jq
- Bash

## Sources Consulted
- Rancher: Monitoring and Alerting
  https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/monitoring-and-alerting
- Rancher: Enable Monitoring
  https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring
- Rancher: Helm Chart Options for Monitoring V2
  https://ranchermanager.docs.rancher.com/v2.14/reference-guides/monitoring-v2-configuration/helm-chart-options
- Rancher: Access Clusters
  https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/manage-clusters/access-clusters
- Rancher: Previous v3 Rancher API Guide
  https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Fleet: Create a GitRepo Resource
  https://fleet.rancher.io/0.10/how-tos-for-users/gitrepo-add
- Fleet: Mapping to Downstream Clusters
  https://fleet.rancher.io/0.10/how-tos-for-users/gitrepo-targets
- Fleet: fleet.yaml reference
  https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet source: namespace selection for deployments
  https://github.com/rancher/fleet/blob/main/internal/namespaces/namespaces.go
- Fleet source: Helm deployer namespace handling
  https://github.com/rancher/fleet/blob/main/internal/helmdeployer/deployer.go
- Prometheus: Federation
  https://prometheus.io/docs/prometheus/latest/federation/
- Prometheus: Alerting rules
  https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Alertmanager: Configuration
  https://prometheus.io/docs/alerting/latest/configuration/
- Alertmanager: Notification template reference
  https://prometheus.io/docs/alerting/latest/notifications/
- Prometheus Operator API reference
  https://prometheus-operator.dev/docs/api-reference/api/
- Grafana: Dashboard JSON model
  https://grafana.com/docs/grafana/latest/reference/dashboard/
- kube-state-metrics: Node metrics
  https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md
- kube-state-metrics: Pod metrics
  https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- The original Rancher API `jq` examples assumed `.version` was always directly printable. I changed them to handle both a string version and an object with `gitVersion`, which avoids runtime failures in `jq`.
- The original Fleet install example used a `helm.cattle.io/v1` `HelmChart` resource, which is not the generic Fleet-native way to install a repo-sourced Helm chart across downstream clusters. I replaced it with a Fleet `fleet.yaml` Helm bundle and increased Prometheus storage from `20Gi` to `50Gi` to match Rancher’s documented minimum recommendation.
- The centralized metrics section said it was configuring Thanos, but the snippet was actually Prometheus federation. I corrected the description, updated the federation config to use the documented `'match[]'` key, and replaced per-cluster `.svc` targets with reachable external endpoints plus explicit `cluster` labels.
- Several PromQL expressions were technically wrong for the stated purpose. I replaced `count(...) by (cluster)` with `max(...)` for cluster up/down status, replaced `count(...)` with `sum(...)` for failed pod totals and ready-node ratios, and fixed the invalid `etcd_server_has_leader by (cluster)` expression to a valid aggregation.
- The `ClusterDown` alert used `absent(up{job="kube-state-metrics"})`, which does not preserve per-cluster labels and would not produce the annotated cluster name shown in the rule. I changed it to `max by (cluster) (up{job="kube-state-metrics"}) == 0`.
- The Alertmanager routing example used deprecated `match` syntax. I updated it to `matchers`, added a root receiver, and kept the receiver templates aligned with current Alertmanager configuration behavior.
- The etcd panel and alert were presented as universally applicable. I narrowed them to self-managed clusters, because managed Kubernetes offerings commonly do not expose etcd metrics in the same way.
- The Grafana section implied a full dashboard export, but the JSON shown was really panel-level example content. I adjusted the section heading so the snippet is accurately framed as panel definitions.

## Review Notes
- The post still uses Rancher’s legacy `/v3` API examples. Rancher documents that the previous v3 API is still available, but newer Rancher Kubernetes API endpoints also exist. The current examples remain acceptable as written.
- The Prometheus federation example assumes each downstream Prometheus endpoint is reachable from the central Prometheus. In a real deployment, that usually means an ingress, private load balancer, VPN, or another routable path between clusters.
- The etcd health checks are only useful where etcd metrics are exposed to Prometheus. That commonly applies to self-managed clusters, not all hosted control planes.
