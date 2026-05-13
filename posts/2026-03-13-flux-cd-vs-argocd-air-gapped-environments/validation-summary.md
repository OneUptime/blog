# Validation Summary: Flux CD vs ArgoCD: Which Is Better for Air-Gapped Environments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Argo CD
- Kubernetes
- GitOps
- Air-gapped Kubernetes deployments
- Container registries
- Helm repositories
- TLS/CA certificate configuration

## Sources Consulted
- Flux official air-gapped installation documentation: https://fluxcd.io/flux/installation/configuration/air-gapped/
- Flux official GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux official HelmRepository/API documentation: https://fluxcd.io/flux/components/source/api/v1/
- Flux CLI source for bootstrap flags: https://github.com/fluxcd/flux2
- Argo CD official private repository/TLS certificate documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD official repo add command documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_repo_add/
- Argo Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml

## Issues Found
- Flux bootstrap was shown without `--registry` and `--image-pull-secret`, which could cause the initial air-gapped install to pull controller images from the public registry. Added those flags to the bootstrap command.
- The Flux `GitRepository` example used `certSecretRef`, which is not the correct CA field for `GitRepository`. Updated the example to state that `ca.crt` belongs in the referenced `secretRef` Secret.
- The Flux `HelmRepository` example did not show the current TLS CA field. Added `certSecretRef`, which is the documented field for Helm repository TLS certificate data.
- The Argo CD Dex image used `ghcr.io/dex/dex`, while the chart and Dex project use `ghcr.io/dexidp/dex`. Updated the mirror list and Helm values repository.
- The Argo CD Helm values used `global.image.imagePullSecret`, which is not a valid chart value. Changed it to the documented `global.imagePullSecrets` list.
- The Argo CD repository command suggested `--tls-client-cert-path` as an alternative for trusting an internal CA. Replaced it with `argocd cert add-tls`, which is the documented CA trust method.
- The comparison table overstated image counts and described Argo CD API reachability imprecisely. Updated the table and conclusion to distinguish Flux default versus optional images, Argo CD supporting images, and Argo CD control-plane access to managed cluster Kubernetes APIs.

## Review Notes
The versions used in the examples are older than current Flux and Argo CD releases as of the review date. They are still useful as pinned examples, but future updates should refresh the exact controller, Redis, and Dex image versions from the relevant release artifacts before publishing.
