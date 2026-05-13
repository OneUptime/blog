# Validation Summary: How to Encrypt Helm Values Files with SOPS for Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux
- Flux HelmRelease
- Flux Kustomization
- Kubernetes Secrets and ConfigMaps
- SOPS
- age
- Helm
- Kustomize
- kubectl

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease guide, including SOPS and values references: https://fluxcd.io/flux/guides/helmreleases/
- SOPS README: https://github.com/getsops/sops
- Kubernetes kubectl generated reference for `kubectl create secret generic`: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- age-keygen manual page: https://man.archlinux.org/man/extra/age/age-keygen.1.en

## Issues Found
- The Helm values Secret was shown in the `flux-system` namespace while the HelmRelease was in the `default` namespace. Flux HelmRelease `valuesFrom` references must point to a Secret or ConfigMap in the same namespace as the HelmRelease. Changed the example Secret namespace and verification command to `default`.
- The post stated that `valuesFrom` overrides inline `values`. Flux merges values references first, then inline `spec.values` overrides them. Updated the explanation to state that inline values override matching keys from `valuesFrom`.
- The explanation implied Flux directly passes decrypted Secret values to Helm. Clarified that Flux decrypts during reconciliation and the Helm controller reads the decrypted values for the Helm chart.

## Review Notes
The examples use the current Flux `helm.toolkit.fluxcd.io/v2` HelmRelease API and `kustomize.toolkit.fluxcd.io/v1` Kustomization API. The SOPS `encrypted_regex: ^(data|stringData)$` pattern aligns with Flux guidance for Kubernetes Secret manifests.
