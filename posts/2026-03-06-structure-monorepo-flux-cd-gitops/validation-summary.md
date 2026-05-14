# Validation Summary: How to Structure a Monorepo for Flux CD GitOps

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Flux Kustomization custom resources
- Flux HelmRelease custom resources
- Flux source-controller resources
- Kustomize
- Kubernetes manifests
- Helm repositories
- cert-manager Helm chart
- SOPS secret decryption
- Bash validation scripts

## Sources Consulted
- Flux repository structure guide: https://fluxcd.io/flux/guides/repository-structure/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux source-controller OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The cluster directory examples did not show a root `clusters/production/kustomization.yaml` that includes `flux-system`, `infrastructure.yaml`, and `apps.yaml`. Without that root Kustomize file, the per-cluster Flux Kustomization resources may not be included in the bootstrapped cluster reconciliation path. Added the root `kustomization.yaml` example and added `kustomization.yaml` to the multi-cluster directory tree.
- The cert-manager HelmRelease used the older `installCRDs: true` chart value and an outdated `1.14.x` chart constraint. Current cert-manager Helm documentation uses `crds.enabled=true`, and the current documented chart series is v1.20. Updated the example to `version: "v1.20.x"` and `crds.enabled: true`.

## Review Notes
- Flux `kustomize.toolkit.fluxcd.io/v1` Kustomization fields such as `interval`, `retryInterval`, `timeout`, `sourceRef`, `path`, `prune`, `wait`, `dependsOn`, `postBuild.substitute`, `postBuild.substituteFrom`, and SOPS `decryption.secretRef` are valid in the current Flux API.
- Flux `helm.toolkit.fluxcd.io/v2` HelmRelease with `spec.chart.spec.sourceRef` remains valid for HelmRepository-backed charts. Flux also supports `chartRef` with OCIRepository for OCI-based Helm charts, which may be preferable for charts whose upstream documentation recommends OCI.
- The validation script is syntactically valid Bash, but this environment does not have the `kustomize` or `flux` CLI installed, so local execution of those tools was not performed.
