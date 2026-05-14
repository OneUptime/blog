# Validation Summary: How to Deploy Service Mesh Observability Stack with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Helm and HelmRelease
- Prometheus and kube-prometheus-stack
- Grafana
- Jaeger
- Istio Telemetry API
- Kiali
- kubectl

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio Telemetry API tracing documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/telemetry-api/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Envoy access log documentation: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Grafana Community Helm Charts README and chart values: https://github.com/grafana-community/helm-charts
- Jaeger Helm chart values for the 3.x chart: https://github.com/jaegertracing/helm-charts
- Kiali CR reference and Helm chart values: https://kiali.io/docs/configuration/kialis.kiali.io/

## Issues Found
- The Grafana Helm repository URL pointed to the old `grafana.github.io/helm-charts` repository. Updated it to `https://grafana-community.github.io/helm-charts`, which is the current HTTP repository after the Grafana chart migration.
- The Prometheus control-plane scrape job used the obsolete `istio-telemetry` service. Updated it to scrape the current `istiod` service on the `http-monitoring` endpoint port, matching Istio's current Prometheus integration docs.
- The Jaeger 3.x chart values used `collector.replicas` and `query.replicas`, but the chart expects `collector.replicaCount` and `query.replicaCount`. Updated both keys.
- The Jaeger section claimed to use an all-in-one deployment while configuring Elasticsearch-backed production components. Removed the inaccurate all-in-one comment.
- The Istio Telemetry example selected a `jaeger` tracing provider without defining the required mesh `extensionProviders` entry. Added an `IstioOperator` meshConfig example that defines the `jaeger` provider using Jaeger's Zipkin-compatible collector port.
- The Grafana and Kiali Jaeger URLs used port `16686` against the `jaeger-query` Kubernetes Service, but the Jaeger 3.x chart exposes the query service on service port `80`. Updated in-cluster URLs and the `kubectl port-forward` command to use service port `80`.
- The Kiali configuration used deprecated `in_cluster_url` and old `url` fields for Grafana and tracing. Updated them to current `internal_url` and `external_url` fields.
- The Flux Kustomization set `wait: true` while also listing `healthChecks`; Flux ignores explicit `healthChecks` when `wait` is true. Removed `wait: true` and changed the checks to target the four `HelmRelease` resources, which is the documented pattern for Kustomizations that apply Helm releases.

## Review Notes
- The post remains pinned to older-but-available chart ranges for kube-prometheus-stack (`65.x`), Grafana (`8.x`), and Jaeger (`3.x`). Those examples now match their stated chart lines, but future updates should consider moving to current major chart versions.
- The examples assume supporting resources exist where referenced, such as `grafana-admin-credentials`, Loki, an Istio Kustomization named `istio`, and a Flux GitRepository named `flux-system`.
- YAML snippets were parsed after editing to catch syntax errors.
