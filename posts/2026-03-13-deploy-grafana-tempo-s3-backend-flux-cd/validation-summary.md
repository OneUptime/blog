# Validation Summary: Deploy Grafana Tempo with S3 Backend Using Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository CRDs
- Grafana Tempo
- Grafana Helm charts
- S3-compatible object storage
- Grafana datasource provisioning
- OpenTelemetry OTLP ingestion
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Grafana Tempo Helm deployment documentation: https://grafana.com/docs/tempo/latest/set-up-for-tracing/setup-tempo/deploy/kubernetes/helm-chart/
- Grafana Tempo configuration reference: https://grafana.com/docs/tempo/latest/configuration/
- Grafana `tempo-distributed` Helm chart values: https://raw.githubusercontent.com/grafana/helm-charts/main/charts/tempo-distributed/values.yaml
- Grafana Tempo datasource provisioning documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The prerequisites listed GCS as an S3-compatible bucket. Tempo supports Google Cloud Storage, but it uses the `gcs` storage backend rather than the S3 backend. I changed the prerequisite to list AWS S3 and MinIO for the S3-compatible path and noted that GCS should use Tempo's GCS backend.
- The HelmRelease configured OTLP receivers under `distributor.config.receivers`, but the current `tempo-distributed` chart exposes OTLP receiver enablement through the `traces.otlp.grpc.enabled` and `traces.otlp.http.enabled` values. I updated the snippet to use those chart values.
- The post attempted to enable TraceQL search with `querier.config.search.external_endpoints`, which is not a current Tempo or `tempo-distributed` chart setting. I replaced it with a valid `queryFrontend.config.search.concurrent_jobs` tuning example.
- The ServiceMonitor example used a top-level `serviceMonitor.enabled` value, but the current `tempo-distributed` chart uses `metaMonitoring.serviceMonitor.enabled`. I updated both the HelmRelease and best-practice text.
- The Grafana datasource URL pointed at port `3100`, which is not the Tempo query-frontend HTTP port in the chart. I changed it to `3200`, matching Tempo's default HTTP listen port and the chart's query-frontend HTTP metrics/API service port.

## Review Notes
- The Flux `HelmRepository`, `HelmRelease`, and `Kustomization` API versions used in the post are current.
- The Grafana datasource `tracesToLogsV2` and `serviceMap` blocks match Grafana Tempo datasource provisioning documentation, assuming the referenced Loki and Prometheus datasource UIDs exist.
- `metaMonitoring.serviceMonitor.enabled` requires the Prometheus Operator `ServiceMonitor` CRD to be installed and selected by the Prometheus instance.
- The example assumes the `monitoring` namespace exists before applying the Secret, HelmRelease, and datasource ConfigMap.
