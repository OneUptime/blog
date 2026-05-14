# Validation Summary: How to Use HelmRelease for Deploying Prometheus with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRelease and HelmRepository APIs
- Kubernetes
- Helm
- kube-prometheus-stack
- Prometheus Operator ServiceMonitor resources
- Prometheus Alertmanager
- Grafana

## Sources Consulted
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Source API v1 reference for HelmRepository: https://fluxcd.io/flux/components/source/api/v1/
- Flux CLI documentation for `flux get helmreleases`: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- kube-prometheus-stack chart source and current `Chart.yaml`: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- kube-prometheus-stack current `values.yaml`: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Prometheus Operator API reference for ServiceMonitor and selectors: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator getting started guide for ServiceMonitor examples: https://prometheus-operator.dev/docs/developer/getting-started/
- Prometheus Alertmanager configuration reference: https://prometheus.io/docs/alerting/latest/configuration/

## Issues Found
- The HelmRelease used `install.atomic` and `upgrade.atomic`, which are not fields in the Flux HelmRelease v2 API. Removed both fields and kept Flux remediation settings.
- The HelmRelease lived in the `monitoring` namespace while relying on `install.createNamespace: true`. Because the HelmRelease object itself needs its namespace to exist before Flux can reconcile it, changed the HelmRelease namespace to `flux-system` and added `targetNamespace: monitoring`.
- Added an explicit `releaseName: kube-prometheus-stack` so the generated Helm release and service names match the verification commands.
- The chart version was pinned to the outdated `65.x` series. Updated it to `85.x`, matching the current kube-prometheus-stack chart series reviewed on 2026-05-14.
- Added the current kube-prometheus-stack Kubernetes version requirement of Kubernetes 1.25 or later.
- Replaced the deprecated Alertmanager route `match` syntax with `matchers`.
- Updated the `defaultRules.rules` keys to match the current kube-prometheus-stack values, replacing the obsolete `k8s` key with the current `k8sContainer*` and `k8sPodOwner` rule groups and adding `kubeStateMetrics`.
- Clarified that cross-namespace ServiceMonitor discovery depends on both `serviceMonitorSelectorNilUsesHelmValues: false` and the chart default `serviceMonitorNamespaceSelector: {}`.
- Updated the `flux get helmrelease` command to query the HelmRelease in `flux-system`.

## Review Notes
- The YAML snippets were parsed successfully with PyYAML.
- Local `helm`, `flux`, and `kubectl` binaries were not installed in the review environment, so command verification was performed against official CLI and API documentation rather than local `--help` output.
- The Grafana admin password and Slack webhook examples are technically valid placeholders, but production deployments should store secrets outside plain Git, for example with SOPS or another Flux-compatible secret management workflow.
