# Validation Summary: How to Configure HelmRelease CRD Installation with Skip Policy in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRelease API
- Flux Kustomization API
- Helm
- Kubernetes CRDs
- kubectl
- cert-manager
- kube-prometheus-stack
- prometheus-operator-crds

## Sources Consulted
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease guide: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization v1 API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Kustomization guide: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Helm chart CRD documentation: https://helm.sh/docs/topics/charts/
- cert-manager v1.14 Helm installation documentation: https://cert-manager.io/v1.14-docs/installation/helm/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- prometheus-community kube-prometheus-stack 57.0.3 Chart.yaml: https://raw.githubusercontent.com/prometheus-community/helm-charts/kube-prometheus-stack-57.0.3/charts/kube-prometheus-stack/Chart.yaml
- prometheus-community kube-prometheus-stack 57.0.3 values.yaml: https://raw.githubusercontent.com/prometheus-community/helm-charts/kube-prometheus-stack-57.0.3/charts/kube-prometheus-stack/values.yaml
- prometheus-community prometheus-operator-crds 10.0.0 Chart.yaml: https://raw.githubusercontent.com/prometheus-community/helm-charts/prometheus-operator-crds-10.0.0/charts/prometheus-operator-crds/Chart.yaml

## Issues Found
- The `prometheus-operator-crds` example used chart version `12.x` with `kube-prometheus-stack` `57.x`. The 57.0.3 stack chart has `appVersion: v0.72.0`, while `prometheus-operator-crds` 10.0.0 matches `appVersion: v0.72.0`; version 12.0.0 targets `v0.74.0`. Updated the CRD HelmRelease example to use `10.x`.
- The main `kube-prometheus-stack` HelmRelease skipped Helm CRDs but did not disable the chart's CRD dependency. In kube-prometheus-stack 57.0.3, `crds.enabled` defaults to `true`, so the main chart could still render and apply CRDs from its CRD subchart. Added `crds.enabled: false` to the main HelmRelease values.

## Review Notes
- Flux HelmRelease `apiVersion: helm.toolkit.fluxcd.io/v2`, `spec.install.crds`, and `spec.upgrade.crds` with `Skip`, `Create`, and `CreateReplace` are current and valid.
- Flux Kustomization `apiVersion: kustomize.toolkit.fluxcd.io/v1`, `dependsOn`, `prune`, and `wait` are current and valid.
- Helm's documented CRD behavior matches the post: CRDs in a chart `crds/` directory are installed cautiously, not upgraded, and not deleted by Helm.
- cert-manager v1.14 supports `installCRDs`, and its documentation recommends installing CRDs separately with `kubectl` for production installations.
