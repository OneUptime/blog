# Validation Summary: Deploy Prometheus Federation with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository CRDs
- kube-prometheus-stack Helm chart
- Prometheus federation
- Prometheus Operator and PrometheusRule CRDs
- PromQL recording rules

## Sources Consulted
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Prometheus federation documentation: https://prometheus.io/docs/prometheus/latest/federation/
- Prometheus Operator design documentation: https://prometheus-operator.dev/docs/getting-started/design/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- kube-prometheus-stack values and templates: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- kube-prometheus-stack package metadata: https://artifacthub.io/packages/helm/prometheus-community/kube-prometheus-stack

## Issues Found
- The HelmRelease pinned kube-prometheus-stack to the old 55.x chart line. Updated the constraint to `>=85.0.0 <86.0.0`, matching the current chart series available at review time.
- The examples created resources in the `monitoring` namespace but did not create that namespace. Added a `Namespace` manifest to the Step 1 YAML.
- The federation scrape targets referenced `prometheus-operated`, while Step 2 creates a `prometheus-federation` Service. Updated the target hostnames to match the Service shown in the guide.
- The leaf Service selector used the older `prometheus` label. Updated it to the current kube-prometheus-stack Service selector label, `operator.prometheus.io/name`, while keeping `app.kubernetes.io/name: prometheus`.
- The Flux Kustomization object was shown as `clusters/global/monitoring/kustomization.yaml`, which would be interpreted as a Kustomize config file when Flux builds `./clusters/global/monitoring`. Renamed the example path to `clusters/global/monitoring-sync.yaml`.

## Review Notes
- The Prometheus federation scrape configuration uses the documented `/federate` endpoint with `honor_labels: true` and `match[]` selectors.
- The kube-prometheus-stack values used for `prometheus.prometheusSpec.retention`, `externalLabels`, and `additionalScrapeConfigs` are valid for the current chart.
- The `PrometheusRule` manifest is valid, and the `release: kube-prometheus-stack` label matches the chart's default rule selector behavior when the Helm release name is `kube-prometheus-stack`.
- The YAML snippets were parsed successfully after edits.
