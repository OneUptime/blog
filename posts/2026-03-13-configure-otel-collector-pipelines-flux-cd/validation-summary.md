# Validation Summary: Configure OpenTelemetry Collector Pipelines with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD v2
- Kubernetes
- HelmRepository and HelmRelease custom resources
- Flux Kustomization custom resources
- OpenTelemetry Collector
- OpenTelemetry Collector Helm chart
- OTLP, Jaeger, Prometheus remote write, and Loki

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease guide: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Source API reference: https://fluxcd.io/flux/components/source/api/v1/
- OpenTelemetry Collector Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
- OpenTelemetry Collector Kubernetes components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Helm chart values: https://github.com/open-telemetry/opentelemetry-helm-charts/blob/main/charts/opentelemetry-collector/values.yaml
- Grafana Loki OpenTelemetry Collector ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/api/

## Issues Found
- The Prometheus receiver example scraped `0.0.0.0:8888`. The OpenTelemetry Helm chart defaults use `${env:MY_POD_IP}:8888` for the Collector's own Prometheus telemetry endpoint, so the example was updated to use `${env:MY_POD_IP}:8888`.
- Step 3 described the change as a ConfigMap patch, but the provided manifest is a Kustomize patch for a Flux `HelmRelease`. The wording was corrected.
- The logs pipeline used the `loki` exporter and `/loki/api/v1/push`. Current Grafana Loki documentation says OpenTelemetry Collector log ingestion should use the `otlphttp` exporter pointed at Loki's OTLP endpoint. The example now uses `otlphttp/loki` with `endpoint: http://loki:3100/otlp`.
- The logs pipeline used a `filelog` receiver without adding the Kubernetes host log volume mounts needed for that receiver to read pod logs. To keep the patch focused on a HelmRelease pipeline change, the example was changed to route OTLP logs through the existing `otlp` receiver.
- Step 4 said the Kustomization managed deployment order, but the manifest did not define `dependsOn`. The wording was corrected to reconciliation and readiness checks.
- The Step 4 health check targeted the chart-created `Deployment`. The example now health-checks the `HelmRelease`, which is the Flux resource directly managed by the Kustomization and represents readiness of the Helm reconciliation.

## Review Notes
- The examples still use placeholder backend service names such as `jaeger-collector`, `prometheus`, and `loki`; these must match the actual in-cluster service names in a real deployment.
- For full Kubernetes node log collection with `filelog`, use a DaemonSet-style Collector deployment or the OpenTelemetry Helm chart `presets.logsCollection` option so the required host volumes and mounts are added.
