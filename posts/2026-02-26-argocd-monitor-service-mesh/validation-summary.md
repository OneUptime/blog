# Validation Summary: How to Monitor Service Mesh with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD and ApplicationSet
- Helm chart deployment through Argo CD
- Kubernetes
- Istio service mesh observability
- Prometheus and Prometheus Operator
- kube-prometheus-stack
- Grafana dashboards
- Kiali
- Jaeger
- OneUptime

## Sources Consulted
- Argo CD ApplicationSet template documentation: https://argo-cd.readthedocs.io/en/release-2.14/operator-manual/applicationset/Template/
- Argo CD Helm values and multiple-source values documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/helm/
- Prometheus Operator API reference for Prometheus, ServiceMonitor, PrometheusRule, and status conditions: https://prometheus-operator.dev/docs/api-reference/api/
- kube-prometheus-stack 55.5.0 values: https://github.com/prometheus-community/helm-charts/blob/kube-prometheus-stack-55.5.0/charts/kube-prometheus-stack/values.yaml
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio observability concepts: https://istio.io/latest/docs/concepts/observability/
- Istio Prometheus Operator add-on manifests: https://github.com/istio/istio/blob/master/samples/addons/extras/prometheus-operator.yaml
- Kiali v1.80 CR reference: https://v1-80.kiali.io/docs/configuration/kialis.kiali.io/
- Kiali authentication documentation: https://kiali.io/docs/configuration/authentication/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/reference/dashboard/

## Issues Found
- The ApplicationSet used `helm.valueFiles: values.yaml` with external Helm chart sources while the article described storing custom values in Git. Updated the ApplicationSet to use Argo CD multiple sources with a `$values` reference and `ignoreMissingValueFiles`, so Git-hosted values files can be used with external Helm charts.
- The Envoy scrape relabeling built `__address__` from the Prometheus port annotation alone, which would produce an invalid address. Updated it to use the pod IP with port `15090`, and added namespace and pod relabeling for raw Envoy metrics.
- The Istio component ServiceMonitor included obsolete Mixer-era components (`mixer`, `galley`, `citadel`). Updated it to monitor the current Istio control-plane selector value `pilot`.
- The Grafana dashboard ConfigMap embedded the dashboard under a top-level `dashboard` property, which matches an API payload shape rather than the dashboard JSON model Grafana imports. Updated it to a direct dashboard JSON object with `title`, `schemaVersion`, `version`, and `panels`.
- The alert and recording rules grouped Istio request metrics by a generic `namespace` label. Updated them to use the documented Istio label `destination_service_namespace`.

## Review Notes
- Kiali `url` and `in_cluster_url` fields are valid for the post's stated Kiali chart version `1.80.0`; newer Kiali documentation has moved toward `external_url` and `internal_url`, so a future refresh should update the chart version and field names together.
- All YAML snippets and embedded dashboard JSON were parsed successfully after the fixes.
