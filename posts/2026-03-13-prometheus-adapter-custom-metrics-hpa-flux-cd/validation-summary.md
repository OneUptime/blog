# Validation Summary: Prometheus Adapter Custom Metrics HPA with Flux CD

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Prometheus Adapter (kubernetes-sigs/prometheus-adapter)
- Kubernetes Custom Metrics API (custom.metrics.k8s.io/v1beta1)
- Kubernetes Horizontal Pod Autoscaler (autoscaling/v2)
- Flux CD (source-controller, helm-controller, kustomize-controller)
- Prometheus / kube-prometheus-stack
- PromQL
- Helm (prometheus-community/prometheus-adapter chart)

## Sources Consulted
- Prometheus Adapter configuration walkthrough: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/config.md
- Prometheus Adapter config walkthrough for external metrics: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/walkthrough.md
- prometheus-community/prometheus-adapter Helm chart: https://github.com/prometheus-community/helm-charts/tree/main/charts/prometheus-adapter
- Flux source-controller HelmRepository v1 API: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux helm-controller HelmRelease v2 API: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux kustomize-controller Kustomization v1 API: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes HPA v2 API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#horizontalpodautoscaler-v2-autoscaling
- Kubernetes Custom and External Metrics: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/

## Issues Found

1. **Invalid template syntax in Step 6 (external metrics rule)** — The `metricsQuery` used `{{.MetricLabel.queue_name}}`, which is not a valid prometheus-adapter template variable. Prometheus Adapter exposes only `<<.Series>>`, `<<.LabelMatchers>>`, and `<<.GroupBy>>` Go templates in `metricsQuery`. Additionally, the `resources.overrides` mapping `externaldns.k8s.io/v1alpha1.dnsendpoints` was a confusing arbitrary mapping for a non-namespaced AWS SQS metric. Replaced the rule with the conventional external-metrics pattern using `resources.template: <<.Resource>>`, a proper `name.matches` regex, and a `metricsQuery` that uses `<<.LabelMatchers>>` with `by (queue_name)` grouping — which is the idiomatic way to filter by `queue_name` from the HPA's `metricSelector`.

## Review Notes
- The HelmRelease uses `helm.toolkit.fluxcd.io/v2` (GA in Flux 2.2+) and `source.toolkit.fluxcd.io/v1` for HelmRepository — both are the current GA API versions.
- `kustomize.toolkit.fluxcd.io/v1` for the Kustomization resource is GA and correct.
- `autoscaling/v2` for the HPA is GA since Kubernetes 1.23 and is the right choice for custom and external metrics.
- The Helm chart version constraint `"4.10.x"` is a valid semver range and matches the current 4.x major line for the prometheus-community/prometheus-adapter chart; readers should still pin to a specific tested minor version in production.
- The `prometheus.url`, `prometheus.port`, and `prometheus.path` values are the correct chart value keys.
- The `custom.metrics.k8s.io/v1beta1` API group used in the debug commands is the API group served by Prometheus Adapter and is correct.
- The `<<.Series>>` / `<<.LabelMatchers>>` template variables used throughout the custom rules are correct.
- Recommendation for the future: consider adding a brief note that External-type HPA metrics require the `external.metrics.k8s.io` API (also served by Prometheus Adapter from its `external` rules), since Step 6 covers external rules but the post never shows an `External`-type HPA metric.
