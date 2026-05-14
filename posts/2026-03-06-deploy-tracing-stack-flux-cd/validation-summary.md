# Validation Summary: How to Deploy Tracing Stack with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository custom resources
- Grafana Tempo
- OpenTelemetry Collector
- Jaeger and Zipkin trace receivers
- OTLP
- Grafana datasource provisioning
- Prometheus scraping and ServiceMonitor
- S3-compatible object storage

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Grafana Tempo Helm chart values: https://github.com/grafana/helm-charts/blob/main/charts/tempo/values.yaml
- Grafana Tempo chart templates: https://github.com/grafana/helm-charts/tree/main/charts/tempo/templates
- Grafana Tempo configuration documentation: https://grafana.com/docs/tempo/latest/configuration/
- OpenTelemetry Collector Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
- OpenTelemetry Collector chart values: https://github.com/open-telemetry/opentelemetry-helm-charts/blob/main/charts/opentelemetry-collector/values.yaml
- OpenTelemetry Kubernetes components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector connectors documentation: https://opentelemetry.io/docs/collector/components/connector/
- Grafana Tempo datasource provisioning documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/

## Issues Found
- The repository structure omitted `otel-daemonset-helmrelease.yaml` even though the post later defines that file. Added it to keep the structure accurate.
- The Tempo HelmRelease placed `resources` at the chart root, but the Tempo chart expects container resources under `tempo.resources`. Moved the resource block under `tempo`.
- The Tempo HelmRelease used `tempo.global_overrides`, which is not the current Tempo chart value. Replaced it with `tempo.overrides.defaults.ingestion` and `tempo.overrides.defaults.global` to match Tempo's standard overrides structure.
- The OpenTelemetry Collector HelmRelease did not set the collector image repository or command. The chart documentation requires these values when installing the chart, so the examples now use the contrib collector image and `otelcol-contrib`.
- The `k8sattributes` processor configuration lacked Kubernetes RBAC. Added a chart-managed ClusterRole with the permissions documented for pod, namespace, and ReplicaSet metadata lookup.
- The metrics pipeline claimed to generate RED metrics from traces but only received OTLP metrics. Added the `spanmetrics` connector, wired it as a traces exporter and metrics receiver, and kept Prometheus as the metrics exporter.
- The Grafana Tempo datasource URL used port `3100`, but the Tempo chart exposes the Tempo HTTP service on port `3200`. Updated the datasource URL to `http://tempo.tracing.svc.cluster.local:3200`.
- The OTLP HTTP curl verification used `localhost:4318` without exposing the collector locally first. Added a `kubectl port-forward` command and clarified that the curl runs from another terminal.

## Review Notes
- The YAML snippets parse successfully after the corrections.
- `0.90.x` for the OpenTelemetry Collector chart is older than the latest chart line, but the post pins that version range and the corrected values were checked against the chart's documented values and templates.
- The Tempo chart version range `1.x` is broad. For production GitOps repositories, pinning an exact chart version is usually safer to avoid unreviewed chart changes during reconciliation.
