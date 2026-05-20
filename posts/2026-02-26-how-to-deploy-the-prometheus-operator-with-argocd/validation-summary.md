# Validation Summary: How to Deploy the Prometheus Operator with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications and sync options
- Helm chart deployment through Argo CD
- Prometheus Operator CRDs
- kube-prometheus-stack
- Kubernetes ServiceMonitor and PrometheusRule resources
- Grafana, Alertmanager, kube-state-metrics, and node-exporter configuration

## Sources Consulted
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/helm/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus community Helm charts repository: https://github.com/prometheus-community/helm-charts
- kube-prometheus-stack 55.5.0 chart metadata and values: https://github.com/prometheus-community/helm-charts/tree/kube-prometheus-stack-55.5.0/charts/kube-prometheus-stack
- prometheus-operator-crds chart tags and metadata: https://github.com/prometheus-community/helm-charts/tree/prometheus-operator-crds-8.0.0/charts/prometheus-operator-crds

## Issues Found
- The CRD Application used both `ServerSideApply=true` and `Replace=true`. Argo CD documents that `Replace=true` takes precedence over `ServerSideApply=true`, so this would not actually use server-side apply for the large CRDs. I removed `Replace=true`.
- The standalone `prometheus-operator-crds` example used chart version `11.0.0`, whose appVersion is Prometheus Operator `v0.73.0`. The main `kube-prometheus-stack` version `55.5.0` uses Prometheus Operator `v0.70.0`. I changed the CRD chart targetRevision to `8.0.0`, which matches appVersion `v0.70.0`.
- The main kube-prometheus-stack Application used `helm.skipCrds: true` but did not explicitly disable the chart's `crds` dependency. I added `crds.enabled: false` to the Helm values so the chart aligns with the separate CRD-management approach.
- The diff-noise section called the ignore-differences settings "resource exclusions." Argo CD resource exclusions are a different feature, so I changed the wording to "resource customizations."

## Review Notes
The ServiceMonitor and PrometheusRule examples are structurally valid, but their labels assume the Prometheus instance selects resources with those labels or that the chart selectors are configured broadly as shown. The example storage class `gp3` is AWS EBS-specific and should be changed for clusters that use a different storage provisioner.
