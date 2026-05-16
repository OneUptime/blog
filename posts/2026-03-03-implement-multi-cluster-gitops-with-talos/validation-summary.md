# Validation Summary: How to Implement Multi-Cluster GitOps with Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- GitOps
- Flux CD (Kustomize controller, Helm controller, Image Automation controller)
- ArgoCD (ApplicationSets)
- Kustomize
- Helm
- Prometheus / kube-prometheus-stack
- PromQL

## Sources Consulted
- Flux Kustomization API: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Helm API v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux ImagePolicy: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux bootstrap github CLI: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- ArgoCD cluster add: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_add/
- ArgoCD ApplicationSet: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/
- argo-helm chart: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/README.md
- argo-helm issue #1780 (server.insecure handling): https://github.com/argoproj/argo-helm/issues/1780
- Talos Linux releases: https://github.com/siderolabs/talos/releases
- Kustomize API: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/

## Issues Found

1. **Deprecated ArgoCD Helm install flag.** The original install command included `--set server.extraArgs[0]="--insecure"`, which is no longer the correct way to enable insecure mode in current versions of the `argo/argo-cd` Helm chart. The chart template decides the listener port from `configs.params."server.insecure"`, so the `extraArgs` entry is ignored and just adds confusion. Removed the redundant flag, leaving the correct `--set configs.params."server\.insecure"=true`.

2. **Outdated Talos installer image tag.** The Talos machine config example pinned `ghcr.io/siderolabs/installer:v1.6.1` (released December 2023), which is significantly behind the current stable line for a post dated March 2026. Updated to `v1.13.2` (the current stable release as of validation).

## Review Notes

- Flux API versions used throughout (`kustomize.toolkit.fluxcd.io/v1`, `helm.toolkit.fluxcd.io/v2`, `image.toolkit.fluxcd.io/v1`) are all the correct GA versions as of early 2026.
- ArgoCD `ApplicationSet` is still `argoproj.io/v1alpha1`; promotion to v1 has been discussed upstream but not yet shipped.
- The `flux bootstrap github` flag set used in the post is valid against current Flux CLI.
- The kube-prometheus-stack chart version is given as `"55.x"`, which is a 2023-era pin — readers will likely want a current major (70.x+ as of mid-2026), but the post is illustrative and the wildcard is a stylistic choice rather than a technical error, so it was left as written.
- The post references the Flux Image Automation Controller and the `Setters` update strategy correctly; `ImageRepository` (referenced via `imageRepositoryRef`) is assumed to exist elsewhere — that's a reasonable simplification for a multi-topic overview.
