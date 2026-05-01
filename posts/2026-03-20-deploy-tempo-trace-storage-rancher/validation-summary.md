# Validation Summary: How to Deploy Tempo on Rancher for Trace Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher-managed Kubernetes
- Helm
- Grafana Tempo (`tempo-distributed` Helm chart)
- S3-compatible object storage
- Grafana data source provisioning
- OpenTelemetry Collector

## Sources Consulted
- Grafana Tempo: Deploy with Helm — https://grafana.com/docs/tempo/latest/setup/helm-chart/
- Grafana Tempo Helm chart README — https://raw.githubusercontent.com/grafana/helm-charts/main/charts/tempo-distributed/README.md
- Grafana Tempo Helm chart values — https://raw.githubusercontent.com/grafana/helm-charts/main/charts/tempo-distributed/values.yaml
- Grafana Tempo query-frontend service template — https://raw.githubusercontent.com/grafana/helm-charts/main/charts/tempo-distributed/templates/query-frontend/service-query-frontend.yaml
- Grafana Tempo configuration reference — https://raw.githubusercontent.com/grafana/tempo/main/docs/sources/tempo/configuration/_index.md
- Grafana Tempo S3 configuration — https://grafana.com/docs/tempo/latest/configuration/hosted-storage/s3/
- Grafana Tempo project README — https://raw.githubusercontent.com/grafana/tempo/main/README.md
- Grafana provisioning docs — https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Tempo data source provisioning — https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- Grafana Tempo trace-to-logs configuration — https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/configure-trace-to-logs/
- OpenTelemetry Collector configuration — https://opentelemetry.io/docs/collector/configuration/

## Issues Found
1. The Helm values example used the wrong structure for the current `grafana/tempo-distributed` chart. The original nested `tempo.storage`, `tempo.ingester`, `tempo.distributor.receivers`, and top-level `resources` blocks do not match the current chart’s values layout. I rewrote the snippet to use the chart-supported keys (`storage`, `ingester.config`, `distributor`, `traces`, and `compactor.config`) so the example aligns with the official chart.

2. The S3 secret flow was incomplete and would not resolve credentials at runtime. The original secret used `access_key_id` / `secret_access_key`, but the Tempo config referenced `${S3_ACCESS_KEY}` / `${S3_SECRET_KEY}` and did not inject the secret into the Tempo pods. I updated the secret keys, added namespace creation, injected the secret with `global.extraEnvFrom`, and enabled environment expansion with `-config.expand-env=true`.

3. The Grafana data source example was not in the official provisioning format and pointed to the wrong Tempo HTTP port. I changed it to a provisioning-file example, corrected the Tempo URL to port `3200`, added `access: proxy`, and fixed `tracesToLogsV2.tags` to use the object format documented by Grafana. I also clarified that `datasourceUid` must match the Loki data source’s actual `uid`.

4. The deployment verification step relied on a log-message grep that is brittle and version-dependent. I replaced it with `kubectl rollout status statefulset/tempo-ingester -n observability`, which is a stable Kubernetes readiness check.

5. The OpenTelemetry Collector example defined an exporter but did not show it being referenced by the traces pipeline. I added the pipeline export reference and clarified that the snippet is meant to be merged into an existing Collector configuration.

## Review Notes
- For current `tempo-distributed` chart versions, the Tempo HTTP API exposed by `query-frontend` is on port `3200`. Older chart versions used `3100`, which is likely why the original example drifted.
- The `tempo-query` / Jaeger UI port `16686` is separate from the Tempo HTTP API and is only exposed when `queryFrontend.query.enabled` is turned on. Grafana should point to the Tempo HTTP API, not the Jaeger UI port.
- Static S3 credentials remain supported, but on AWS, IAM roles or IRSA are preferable to long-lived access keys for production deployments.
