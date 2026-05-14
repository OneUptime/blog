# Validation Summary: How to Configure Flagger Metrics Analysis with Prometheus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger
- Flux Helm Controller and HelmRepository
- Prometheus
- PromQL
- Kubernetes
- Istio
- NGINX Ingress
- Helm charts

## Sources Consulted
- Flagger Metrics Analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flagger FAQ metrics and Kubernetes services documentation: https://docs.flagger.app/faq
- Flagger install with Flux documentation: https://fluxcd.io/flagger/install/flagger-install-with-flux/
- Flagger install on Kubernetes documentation: https://docs.flagger.app/install/flagger-install-on-kubernetes
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- prometheus-community/prometheus chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/prometheus/values.yaml
- Prometheus chart Artifact Hub listing: https://artifacthub.io/packages/helm/prometheus-community/prometheus
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found
- The Prometheus Flux `HelmRelease` used `metadata.namespace: monitoring` with `install.createNamespace: true`. A HelmRelease object cannot be created in a namespace that does not already exist, and Flux only creates the target release namespace. I changed the HelmRelease to live in `flux-system`, set `targetNamespace: monitoring`, and set `releaseName: prometheus` so the documented `prometheus-server.monitoring` service name remains correct.
- The Flux `HelmRelease` snippets used `helm.toolkit.fluxcd.io/v1`. Current Flux documentation uses the GA `helm.toolkit.fluxcd.io/v2` API, so both HelmRelease examples were updated.
- The Prometheus chart version was pinned to `25.x`, while the current prometheus-community chart line is `29.x`. I updated the version range to `29.x`.
- The Canary analysis interval was `30s` while metric intervals were `1m`. Flagger documents that metric intervals should be lower than or equal to the control loop interval, so both Canary examples now use `analysis.interval: 1m`.
- The custom Prometheus pod-name queries used `{{ target }}-canary-...`, but Flagger's generated canary service selects the original workload labels and Flagger's own metric examples match `{{ target }}` pod/workload names. I updated the custom PromQL examples and debugging query to match `{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)`.
- The Istio custom success-rate query matched `destination_workload="{{ target }}-canary"`. Flagger's Istio examples use `{{ target }}`, so I corrected both numerator and denominator.
- The infrastructure CPU example averaged the raw `container_cpu_usage_seconds_total` counter. I changed it to average the rate over `{{ interval }}`.
- The post listed only a subset of Flagger MetricTemplate variables. I updated the variable comments and troubleshooting list to include `name`, `service`, and `variables`.

## Review Notes
- The custom `http_requests_total` and `http_request_duration_seconds_bucket` examples are syntactically valid PromQL, but metric names and labels are application-specific. Readers still need to adapt them to the metrics emitted by their application or ingress/service mesh.
- The Flagger HelmRelease snippet assumes a `HelmRepository` named `flagger` exists in `flux-system`; the post focuses on Prometheus metrics configuration and does not show that repository definition.
