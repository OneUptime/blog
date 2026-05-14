# Validation Summary: How to Set Up HelmRepository for Prometheus Charts in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Helm
- HelmRepository
- HelmRelease
- Prometheus
- kube-prometheus-stack
- Alertmanager
- Grafana
- Prometheus Adapter

## Sources Consulted
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux `flux get sources helm` command reference: https://fluxcd.io/flux/cmd/flux_get_sources_helm/
- Flux `flux get helmreleases` command reference: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Prometheus community Helm charts repository: https://github.com/prometheus-community/helm-charts
- Prometheus community Helm chart index: https://prometheus-community.github.io/helm-charts/index.yaml
- kube-prometheus-stack chart README and values: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- Prometheus chart README and values: https://github.com/prometheus-community/helm-charts/tree/main/charts/prometheus
- prometheus-adapter chart README and values: https://github.com/prometheus-community/helm-charts/tree/main/charts/prometheus-adapter
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus promtool command documentation: https://prometheus.io/docs/prometheus/latest/command-line/promtool/

## Issues Found
- The chart version ranges were outdated for the current Prometheus community Helm repository. Updated `kube-prometheus-stack` from `67.*` to `85.*`, `prometheus` from `26.*` to `29.*`, and `prometheus-adapter` from `4.*` to `5.*` based on the current chart index.
- The kube-prometheus-stack HelmRelease comment said CRDs were installed separately, but Flux `install.crds: CreateReplace` and `upgrade.crds: CreateReplace` manage CRDs during Helm install and upgrade. Updated the comment to describe the actual behavior.

## Review Notes
- The example uses an inline Grafana admin password placeholder. For a real GitOps production deployment, prefer a Kubernetes Secret, SOPS, External Secrets, or another secret-management workflow rather than committing credentials in Helm values.
- The HelmRelease manifests assume the `monitoring` namespace already exists. In a full GitOps repository, include a Namespace manifest or create the namespace before applying these resources.
