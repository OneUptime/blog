# Validation Summary: How to Deploy Mimir on Rancher for Metrics Storage - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- Grafana Mimir
- Prometheus Operator
- Prometheus remote write
- Grafana provisioning
- MinIO

## Sources Consulted
- Grafana Mimir Helm chart docs: https://grafana.com/docs/helm-charts/mimir-distributed/latest/get-started-helm-charts/
- Grafana Mimir production Helm guidance: https://grafana.com/docs/helm-charts/mimir-distributed/latest/run-production-environment-with-helm/
- Grafana Mimir Helm chart source and values: https://github.com/grafana/mimir/tree/main/operations/helm/charts/mimir-distributed
- Grafana Mimir deployment modes and architecture: https://grafana.com/docs/mimir/latest/references/architecture/deployment-modes/
- Grafana Mimir configuration parameters: https://grafana.com/docs/mimir/latest/configure/configuration-parameters/
- Grafana Mimir HTTP API: https://grafana.com/docs/mimir/latest/references/http-api/
- Grafana Mimir monitoring mixin alerts: https://github.com/grafana/mimir/tree/main/operations/mimir-mixin
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Grafana provisioning docs: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Rancher monitoring documentation: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/observability/monitoring-and-dashboards/

## Issues Found
- The post described the `mimir-distributed` chart as a monolithic deployment and used value keys that do not match the current chart. I updated the values example to a current classic-architecture configuration for the `mimir-distributed` chart, including disabling ingest storage/Kafka and moving settings to valid component keys such as `gateway` and `metaMonitoring.serviceMonitor`.
- The original values file placed persistence and resources under `mimir`, which is not how the current chart structures component settings. I moved persistence settings to the relevant components so the example matches the current Helm chart.
- The original TSDB example used `retention_period: 0`, which is not a valid duration for this setting. I changed it to `13h`, which matches the documented default for classic TSDB block retention in ingesters.
- The post used `mimir-nginx` service URLs, but the current chart exposes the in-cluster endpoints through the gateway service. I updated the Prometheus, Grafana, and Alertmanager examples to use `mimir-gateway`.
- The Grafana data source example placed `httpHeaderValue1` under `jsonData`. Grafana provisioning expects header names in `jsonData` and header values in `secureJsonData`, so I corrected that.
- The Alertmanager API example posted raw Alertmanager YAML with `-d`. The current Mimir HTTP API expects an `alertmanager_config` payload, and the docs recommend `--data-binary` for YAML bodies. I updated the curl example accordingly.
- The bucket-creation example assumed the MinIO server container had the `mc` client installed. I replaced it with a temporary `minio/mc` client pod so the command sequence is runnable as written.
- The Mimir self-monitoring alert used `mimir_ring_members`, but the current mixin uses `cortex_ring_members`. I corrected the alert expression and aligned the alert duration with the upstream mixin example.
- The multi-cluster Step 4 staging example was only a YAML fragment. I converted it to a complete `Prometheus` resource example so the snippet stands on its own.

## Review Notes
- Current Grafana Mimir guidance recommends the newer Kubernetes Monitoring Helm chart and Grafana Alloy for meta-monitoring instead of relying on the Mimir chart’s built-in meta-monitoring settings. The post’s ServiceMonitor-based approach is still workable for Rancher Monitoring, but it is no longer the primary recommendation in Grafana’s latest docs.
- The current `mimir-distributed` chart defaults to ingest storage with Kafka. This post now explicitly configures classic architecture because that matches the storage and WAL assumptions used throughout the guide.
