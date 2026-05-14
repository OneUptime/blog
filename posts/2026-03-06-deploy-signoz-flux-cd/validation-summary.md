# Validation Summary: How to Deploy Signoz with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- SigNoz
- Flux CD
- Kubernetes
- Helm and HelmRelease resources
- Kustomize and Flux Kustomization resources
- OpenTelemetry and OTLP
- ClickHouse
- Kubernetes Ingress

## Sources Consulted
- SigNoz Kubernetes Helm installation docs: https://signoz.io/docs/install/kubernetes/local/
- SigNoz Helm chart repository and current chart values: https://github.com/SigNoz/charts and https://raw.githubusercontent.com/SigNoz/charts/main/charts/signoz/values.yaml
- SigNoz Helm chart index: https://charts.signoz.io/index.yaml
- SigNoz retention period docs: https://signoz.io/docs/userguide/retention-period/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease guide: https://v2-7.docs.fluxcd.io/flux/guides/helmreleases/
- Flux Kustomization docs: https://fluxcd.io/flux/components/kustomize/kustomizations/
- OpenTelemetry OTLP exporter configuration docs: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The HelmRelease pinned `0.52.x`, an older 2024 SigNoz chart line. Updated it to the current `0.122.x` chart line available from the official SigNoz chart index.
- The Helm values used removed or obsolete chart keys, including `frontend`, `queryService`, `alertmanager`, `clickhouse.replicaCount`, and `otelCollectorMetrics`. Replaced them with current `signoz`, `clickhouse.layout`, `global.storageClass`, and `otelCollector` values from the official chart.
- The repository structure and Kustomize file omitted `ingress.yaml`, so the ingress created later would not be reconciled by Flux. Added `ingress.yaml` to both examples.
- The Flux Kustomization used `wait: true` together with `healthChecks`; Flux ignores `healthChecks` when `wait` is true. Removed the redundant health check block.
- The OpenTelemetry application example targeted OTLP/gRPC port `4317` without setting the OTLP protocol. Added `OTEL_EXPORTER_OTLP_PROTOCOL=grpc`.
- The retention example created an arbitrary ConfigMap that SigNoz would not consume for retention settings. Replaced it with the documented self-hosted retention configuration path in the SigNoz UI and corrected the current default retention periods.
- The Ingress and port-forward examples referenced the removed `signoz-frontend` service and old port `3301`. Updated them to the current `signoz` service on port `8080`.
- The ClickHouse log selector used `app=clickhouse`, which does not match the current chart labels. Updated it to `app.kubernetes.io/component=clickhouse`.
- The troubleshooting section referenced scaling the removed query service. Updated it to refer to increasing resources for the SigNoz service.

## Review Notes
- Local `helm`, `kubectl`, and `flux` binaries were not installed in the review environment, so CLI behavior was checked against official documentation rather than local `--help` output.
- YAML snippets in the post were parsed successfully after the fixes.
