# Validation Summary: How to Monitor Clusters with Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher Monitoring
- Kubernetes
- Helm
- Prometheus Operator
- Prometheus
- Alertmanager
- Grafana
- Thanos
- OpenTelemetry
- OneUptime

## Sources Consulted
- Rancher Enable Monitoring documentation: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring
- Rancher Monitoring Helm Chart Options: https://ranchermanager.docs.rancher.com/reference-guides/monitoring-v2-configuration/helm-chart-options
- Rancher ServiceMonitor and PodMonitor Configuration: https://ranchermanager.docs.rancher.com/reference-guides/monitoring-v2-configuration/servicemonitors-and-podmonitors
- Rancher Receiver Configuration: https://ranchermanager.docs.rancher.com/reference-guides/monitoring-v2-configuration/receivers
- Rancher `rancher-monitoring` chart `values.yaml`: https://github.com/rancher/charts/blob/main/charts/rancher-monitoring/values.yaml
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator Thanos guide: https://prometheus-operator.dev/docs/platform/thanos/
- Prometheus Alertmanager configuration reference: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus remote write specification: https://prometheus.io/docs/specs/prw/remote_write_spec/
- OneUptime Incoming Request Monitor documentation: https://oneuptime.com/docs/en/monitor/incoming-request-monitor
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
1. The architecture diagram used `rancher-monitoring namespace`, but Rancher deploys the monitoring app into `cattle-monitoring-system`. Updated the diagram label.
2. The UI installation instructions pointed to the generic Apps sidebar. Rancher's current enable-monitoring flow uses Cluster Tools for the non-SSL install path. Updated the instruction.
3. The production Helm values used `nodeExporter.resources` and `kubeStateMetrics.resources`, but Rancher's chart puts resource settings under the subcharts `prometheus-node-exporter.resources` and `kube-state-metrics.resources`. Updated the keys and aligned the example requests/limits with the chart defaults.
4. The ServiceMonitor label comment implied `release: rancher-monitoring` is always required. Rancher's current chart default selectors are `{}` and select all ServiceMonitors unless customized. Reworded the comment to avoid a false requirement.
5. The Grafana dashboard ConfigMap used `cattle-monitoring-system`, but Rancher's default Grafana sidecar watches `cattle-dashboards` for dashboard ConfigMaps. Updated the namespace.
6. The Alertmanager route and inhibition examples used deprecated `match`, `source_match`, and `target_match` fields. Replaced them with current `matchers`, `source_matchers`, and `target_matchers` syntax.
7. The Thanos sidecar example used `objectStorageConfig.existingSecret`, but Prometheus Operator expects `objectStorageConfig` to be a `SecretKeySelector` with `name` and `key`. Updated the snippet.
8. The OneUptime webhook URL used an undocumented `/api/incoming-request/...` pattern. Updated it to the documented Incoming Request heartbeat URL pattern.
9. The OneUptime metrics example showed Prometheus remote write to an undocumented `/api/metrics/write` endpoint and used deprecated clear-text `bearerToken` style authentication. Replaced the example with the documented OneUptime OTLP endpoint pattern for metric ingestion through OpenTelemetry.

## Review Notes
- `helm` and `kubectl` were not installed in the local environment, so CLI verification used official documentation and chart source instead of local `--help` output.
- YAML snippets in the post were parse-checked with PyYAML after edits.
