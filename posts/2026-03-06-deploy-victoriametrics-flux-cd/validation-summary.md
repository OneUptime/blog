# Validation Summary: How to Deploy VictoriaMetrics with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- VictoriaMetrics
- VictoriaMetrics Helm charts
- Kubernetes
- HelmRelease and HelmRepository custom resources
- Prometheus-compatible scrape configuration
- Grafana datasource provisioning

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization CRD source: https://github.com/fluxcd/kustomize-controller
- VictoriaMetrics single Helm chart documentation: https://docs.victoriametrics.com/helm/victoria-metrics-single/
- VictoriaMetrics cluster Helm chart documentation: https://docs.victoriametrics.com/helm/victoria-metrics-cluster/
- VictoriaMetrics Helm chart repository index: https://victoriametrics.github.io/helm-charts/index.yaml
- VictoriaMetrics Helm chart source values and templates: https://github.com/VictoriaMetrics/helm-charts
- VictoriaMetrics Kubernetes monitoring guide: https://docs.victoriametrics.com/guides/k8s-monitoring-via-vm-single/
- Kubernetes service discovery configuration in VictoriaMetrics: https://docs.victoriametrics.com/victoriametrics/sd_configs/

## Issues Found
- The single-node HelmRelease pinned `victoria-metrics-single` to `0.12.x`, which is an old chart series. I updated it to `0.38.x`, the current chart series available in the official VictoriaMetrics Helm repository on 2026-05-14.
- The cluster HelmRelease pinned `victoria-metrics-cluster` to `0.14.x`, which is an old chart series. I updated it to `0.42.x`, the current chart series available in the official VictoriaMetrics Helm repository on 2026-05-14.
- The single-node and cluster storage examples used `persistentVolume.storageClass`. The current VictoriaMetrics chart values use `persistentVolume.storageClassName`, so I corrected both examples.
- The single-node example placed `serviceMonitor.enabled` at the chart root. The current single-node chart expects this under `server.serviceMonitor`, so I moved it under `server`.
- The API server scrape example used the Kubernetes service account CA without `insecure_skip_verify`. The official VictoriaMetrics Kubernetes scrape examples include `insecure_skip_verify: true` for this target to avoid certificate-name validation failures when scraping discovered endpoint addresses, so I added it.
- The `curl` example left the query URL unquoted. I quoted it so shells do not treat `?` as a glob character.

## Review Notes
- The Flux API versions used in the post, including `source.toolkit.fluxcd.io/v1`, `helm.toolkit.fluxcd.io/v2`, and `kustomize.toolkit.fluxcd.io/v1`, are current.
- The VictoriaMetrics chart defaults create cluster-scoped RBAC when `server.scrape.enabled` is true, which supports the Kubernetes service discovery roles used in the scrape configuration.
- The Grafana datasource ConfigMap label is deployment-specific; it is valid for Grafana installations configured with a sidecar that discovers datasource ConfigMaps by `grafana_datasource: "true"`.
