# Validation Summary: How to Bootstrap Monitoring Stack with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications, sync waves, Helm sources, automated sync, and sync options
- Kubernetes manifests, Secrets, ConfigMaps, Services, PVCs, and kubectl
- Helm charts for `kube-prometheus-stack` and Grafana
- Prometheus Operator CRDs: ServiceMonitor and PrometheusRule
- Prometheus, Alertmanager, Grafana dashboards, and Argo CD metrics

## Sources Consulted
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/application-specification/
- Argo CD Helm usage and release names: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD sync options and server-side apply: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD metrics and Prometheus Operator ServiceMonitor examples: https://argo-cd.readthedocs.io/en/release-2.14/operator-manual/metrics/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Prometheus Operator API reference for ServiceMonitor, PrometheusRule, and AlertmanagerConfig: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator alerting routes and Alertmanager Secret behavior: https://prometheus-operator.dev/docs/developer/alerting/
- Prometheus Alertmanager configuration reference: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus community `kube-prometheus-stack` chart values and templates for chart version 56.6.2: https://github.com/prometheus-community/helm-charts/tree/kube-prometheus-stack-56.6.2/charts/kube-prometheus-stack
- Grafana Helm chart values for chart version 7.3.7: https://github.com/grafana/helm-charts/tree/grafana-7.3.7/charts/grafana

## Issues Found
- The first Argo CD Application described `ServerSideApply=true` as required for CRDs. Argo CD documents server-side apply as useful for cases such as large resources that exceed the client-side apply annotation size, so the comment was changed to "Useful for large CRDs."
- The split-stack Prometheus Application claimed to install "operator and CRDs only" while it also enabled Prometheus and Alertmanager. The comment was corrected, and `releaseName: monitoring` plus `fullnameOverride: monitoring` were added so the later Grafana datasource URL and verification command point at the service name produced by the chart.
- The Grafana dashboard ConfigMap used the API import wrapper shape (`{"dashboard": ...}`), but the sidecar provisions dashboard JSON files directly. The JSON was changed to a dashboard model with top-level `title`, `schemaVersion`, and `panels`.
- The Argo CD ServiceMonitor selected every service labeled `app.kubernetes.io/part-of: argocd`, which is broader than the official Argo CD examples and may match services without the expected `metrics` port. It was changed to select `app.kubernetes.io/name: argocd-metrics`.
- The Alertmanager route example used deprecated `match` fields. It was updated to use `matchers` as recommended by the Alertmanager configuration reference.
- The Alertmanager Secret example did not mention that `kube-prometheus-stack` renders the same native config Secret by default. A note was added to set `alertmanager.alertmanagerSpec.useExistingSecret: true` when managing that Secret separately.

## Review Notes
The pinned chart versions are older than current releases as of 2026-05-20, but the examples now match the APIs and chart values for the versions used in the post. The placeholder domains, Slack webhook, PagerDuty key, storage class, and repository URLs still need to be replaced by real environment-specific values before use.
