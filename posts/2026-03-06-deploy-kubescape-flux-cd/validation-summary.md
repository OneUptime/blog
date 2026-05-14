# Validation Summary: How to Deploy Kubescape with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRepository, HelmRelease, and Kustomization APIs
- Kubescape Operator
- Kubescape CLI
- Kubernetes NetworkPolicy
- Prometheus Operator ServiceMonitor and PrometheusRule resources

## Sources Consulted
- Kubescape Operator overview: https://kubescape.io/docs/operator/
- Kubescape Operator installation guide: https://kubescape.io/docs/install-operator/
- Kubescape continuous scanning documentation: https://kubescape.io/docs/operator/continuous-scanning/
- Kubescape vulnerability scanning documentation: https://kubescape.io/docs/operator/vulnerabilities/
- Kubescape Prometheus integration documentation: https://kubescape.io/docs/operator/prometheus-integration/
- Kubescape scanning CLI documentation: https://kubescape.io/docs/scanning/
- Kubescape Helm chart values and templates: https://github.com/kubescape/helm-charts/tree/main/charts/kubescape-operator
- Kubescape CLI command source: https://github.com/kubescape/kubescape/tree/master/cmd
- Kubescape Prometheus exporter metrics source: https://github.com/kubescape/prometheus-exporter
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The HelmRelease values used non-current or ignored Kubescape chart keys such as component-level `enabled`, `kubescape.scanSchedule`, `kubescape.submit`, `kubescape.skipNamespaces`, `storage.persistence`, and `global.overrideImageRegistry`. Updated the values to use current chart keys including `capabilities.*`, `excludeNamespaces`, `kubescapeScheduler.scanSchedule`, `kubevulnScheduler.scanSchedule`, `persistence.size`, and supported component resource blocks.
- The post referenced deprecated `kollector` and `gateway` components. Removed those values and aligned the text with the current `synchronizer`-era Kubescape operator architecture.
- The scan framework ConfigMap was not consumed by the Kubescape Helm chart. Replaced it with the supported `kubescapeScheduler.requestBody` configuration for scheduled framework scans.
- The Prometheus ServiceMonitor example used labels and ports that did not match current chart templates. Changed the guidance to enable chart-managed ServiceMonitors via Helm values.
- The Prometheus alert expressions used metric names that do not match current Kubescape CLI/exporter metrics. Updated them to current metric names such as `kubescape_framework_complianceScore`, `kubescape_controls_total_cluster_critical`, and `kubescape_vulnerabilities_total_cluster_high`.
- The NetworkPolicy selected the wrong labels and would block required internal Kubescape traffic. Updated the selector to current component labels and allowed required internal ports.
- The Flux Kustomization health checks targeted Helm-created Deployments from the parent Kustomization. Updated the health check to target the `HelmRelease`, which is the resource Flux directly reconciles.
- The verification commands attempted to exec the Kubescape CLI from `deploy/kubescape`. Replaced them with supported Kubescape CLI commands for operator-triggered scans and local framework scans.
- The troubleshooting command for operator logs pointed at `deploy/kubescape`. Updated it to `deploy/operator`.

## Review Notes
The Flux API versions used in the post are current. The chart version constraint `1.x` is valid for the Kubescape operator chart family, but production deployments should pin a tested patch version when reproducibility is more important than automatic minor updates.
