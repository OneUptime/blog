# Validation Summary: How to Handle Breaking Changes When Upgrading Flux CD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Kubernetes
- Flux CLI
- Flux Kustomization, HelmRelease, GitRepository, and notification APIs
- Kubernetes RBAC
- GitHub Actions

## Sources Consulted
- Flux upgrade documentation: https://fluxcd.io/flux/installation/upgrade/
- Flux install command reference: https://fluxcd.io/flux/cmd/flux_install/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux notification API reference: https://fluxcd.io/flux/components/notification/api/
- Flux export command reference: https://fluxcd.io/flux/cmd/flux_export/
- Flux v2.4.0 release notes: https://github.com/fluxcd/flux2/releases/tag/v2.4.0
- Flux v2.3.0 release notes: https://github.com/fluxcd/flux2/releases/tag/v2.3.0
- Announcing Flux 2.3 GA: https://fluxcd.io/blog/2024/05/flux-v2.3.0/

## Issues Found
- The Kustomization migration example said it was showing a deprecated `v1beta2` resource, but the `BEFORE` manifest already used `kustomize.toolkit.fluxcd.io/v1`. Changed the `BEFORE` manifest to `v1beta2`.
- The HelmRelease migration example said it was showing a deprecated API, but the `BEFORE` manifest already used `helm.toolkit.fluxcd.io/v2`. Changed the example to use `v2beta2`.
- The HelmRelease example claimed that `valuesFrom` format changed and added `targetPath: ""`. The official API keeps `valuesFrom` and `targetPath` is optional. Replaced the example with the real `valuesFile` to `valuesFiles` migration.
- The GitRepository migration example included the removed `gitImplementation` field while using the stable `source.toolkit.fluxcd.io/v1` API. Changed the `BEFORE` manifest to `v1beta2`.
- The deprecation scanning script incorrectly treated stable `helm.toolkit.fluxcd.io/v2` as deprecated and missed Helm beta versions. Updated the scan to check `v2beta1` and `v2beta2` instead.
- The notification API scan treated `notification.toolkit.fluxcd.io/v1` as deprecated. Updated it to scan older beta versions instead.
- The reconciliation behavior example described Kustomization `force`, `wait`, and `timeout` as drift detection. Updated the heading and comments to match the official field semantics.
- The RBAC section implied that the listed permissions were universally new required permissions. Reworded it to clarify that these are examples to verify when maintaining custom restricted controller roles.
- The staged upgrade commands used `flux install --crds=CreateReplace`, which is not a valid current `flux install` flag. Replaced it with `flux install --version=v2.4.0 --export`.

## Review Notes
The post remains a general upgrade guide rather than a version-specific migration checklist. Future updates should mention that newer Flux releases may remove older beta APIs after their deprecation window, so readers should always compare their source and target versions' release notes before applying the examples.
