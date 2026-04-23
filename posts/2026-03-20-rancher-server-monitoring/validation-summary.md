# Validation Summary: How to Monitor Rancher Server Resource Usage - Monitoring

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher Monitoring
- Prometheus
- Prometheus Operator
- Grafana
- Fleet
- etcd
- Kubernetes
- PromQL

## Sources Consulted
- Rancher docs: Enable Monitoring https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring
- Rancher docs: How Monitoring Works https://ranchermanager.docs.rancher.com/integrations-in-rancher/monitoring-and-alerting/how-monitoring-works
- Rancher docs: ServiceMonitor and PodMonitor Configuration https://ranchermanager.docs.rancher.com/v2.13/reference-guides/monitoring-v2-configuration/servicemonitors-and-podmonitors
- Rancher Monitoring chart: Rancher ServiceMonitor template https://github.com/rancher/charts/blob/main/charts/rancher-monitoring/109.0.0%2Bup80.9.1-rancher.5/templates/rancher-monitoring/exporters/rancher/servicemonitor.yaml
- Rancher Monitoring chart: Rancher Performance Debugging dashboard https://github.com/rancher/charts/blob/main/charts/rancher-monitoring/109.0.0%2Bup80.9.1-rancher.5/files/rancher/performance/performance-debugging.json
- Rancher source: metrics registration gate (`CATTLE_PROMETHEUS_METRICS`) https://github.com/rancher/rancher/blob/main/pkg/multiclustermanager/app.go
- Rancher source: custom Rancher metrics definitions https://github.com/rancher/rancher/blob/main/pkg/metrics/metrics.go
- Rancher source: node and core metric definitions https://github.com/rancher/rancher/blob/main/pkg/metrics/node.go
- Fleet docs: Status Fields https://fleet.rancher.io/ref-status-fields
- Fleet source: bundle metrics https://github.com/rancher/fleet/blob/main/internal/metrics/bundle_metrics.go
- Fleet source: cluster metrics https://github.com/rancher/fleet/blob/main/internal/metrics/cluster_metrics.go
- Prometheus Operator API reference https://prometheus-operator.dev/docs/api-reference/api/
- etcd metrics reference https://etcd.io/docs/v3.6/metrics/
- etcd quota metric explanation https://etcd.io/blog/2023/how_to_debug_large_db_size_issue/

## Issues Found
- The post implied Rancher's advanced Prometheus metrics were immediately available at `/metrics`. Rancher only registers the advanced Rancher-specific metrics used by the performance dashboard when `CATTLE_PROMETHEUS_METRICS=true`, so Step 1 was corrected to enable that setting and verify the rollout.
- The ServiceMonitor example was inaccurate for Rancher Monitoring. It used the wrong namespace, an invalid port name, and a custom bearer-token secret flow that does not match Rancher's shipped monitoring configuration. Step 2 was changed to verify the ServiceMonitor Rancher Monitoring creates automatically in `cattle-system`.
- Several Rancher metric names in the post were not real metrics exposed by Rancher, including `rancher_api_request_total`, `rancher_api_request_duration_seconds_bucket`, `rancher_cluster_count`, and `rancher_cluster_ready`. These were replaced with Rancher's actual metrics from the official performance dashboard and source code: `steve_api_*`, `session_server_*`, and `cluster_manager_*`.
- The Grafana and PromQL examples had query issues. The request-rate aggregation used invalid PromQL aggregation syntax, and the JSON dashboard used invalid single-quoted label matchers for PromQL. Those expressions were corrected.
- The Fleet section used the wrong state name (`Errored`) and overly generic state queries. It was updated to current Fleet metrics and states: `fleet_bundle_ready`, `fleet_bundle_desired_ready`, `fleet_bundle_err_applied`, and `fleet_cluster_state{state="NotReady"}`.
- The alerting and recording-rule sections referenced the removed/nonexistent Rancher metrics. They were updated to use the corrected metric set, and the memory alert/query now sums Rancher container memory across Rancher pods instead of treating a single container series as the server total.
- The conclusion referenced healthy/disconnected cluster metrics that were not actually available in the post's examples. It was updated to describe the metrics the corrected queries really measure.

## Review Notes
- Rancher Monitoring already ships Rancher and Fleet ServiceMonitors for the local cluster when `rancherMonitoring.enabled=true`, so duplicating a custom ServiceMonitor is usually unnecessary.
- The etcd quota alert is only applicable when the local cluster exposes etcd metrics; that depends on the Rancher installation and local-cluster control-plane topology.
- Rancher's current monitoring chart still uses file-based bearer token configuration in its own Rancher ServiceMonitor template. Prometheus Operator documents file-based token fields as deprecated/security-sensitive, but Rancher's shipped template still relies on that mechanism today.
