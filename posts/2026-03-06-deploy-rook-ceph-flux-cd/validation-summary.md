# Validation Summary: How to Deploy Rook-Ceph with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Rook-Ceph
- Ceph
- Kubernetes
- Helm
- Kustomize
- PersistentVolumeClaims and StorageClasses

## Sources Consulted
- Rook-Ceph v1.14 prerequisites: https://rook.github.io/docs/rook/v1.14/Getting-Started/Prerequisites/prerequisites/
- Rook-Ceph v1.14 upgrade notes and Kubernetes support: https://rook.io/docs/rook/v1.14/Upgrade/rook-upgrade/
- Rook-Ceph operator Helm chart documentation: https://rook.io/docs/rook/v1.14/Helm-Charts/operator-chart/
- Rook-Ceph cluster Helm chart documentation: https://rook.github.io/docs/rook/latest-release/Helm-Charts/ceph-cluster-chart/
- Rook-Ceph cleanup documentation: https://rook.io/docs/rook/latest-release/Getting-Started/ceph-teardown/
- Flux HelmRelease documentation: https://v2-0.docs.fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Rook v1.14.12 Helm chart values on GitHub: https://raw.githubusercontent.com/rook/rook/v1.14.12/deploy/charts/rook-ceph/values.yaml and https://raw.githubusercontent.com/rook/rook/v1.14.12/deploy/charts/rook-ceph-cluster/values.yaml

## Issues Found
- The prerequisites said Kubernetes v1.25 or later, but the post pins Rook-Ceph chart version `1.14.x`. Rook v1.14 supports Kubernetes v1.25 through v1.30, so the prerequisite was updated to state that version range.
- The repository structure listed `storageclass.yaml`, but the guide creates StorageClasses through the `rook-ceph-cluster` Helm chart and never creates a standalone `storageclass.yaml`. The unused file was removed from the structure.
- The Helm values enabled monitoring without listing Prometheus Operator CRDs as a prerequisite. The examples were changed to keep monitoring disabled by default and note that it should be enabled only when the Prometheus Operator CRDs are installed.
- The cleanup section described the `cleanupPolicy` patch as finalizer cleanup and placed it after Git removal. Rook documentation requires setting the cleanup policy before deleting the `CephCluster` if Rook should wipe host paths and OSD devices, so the wording and command order were corrected.

## Review Notes
The post is technically valid after the fixes. The examples are pinned to Rook-Ceph `1.14.x`, which is not the newest Rook documentation line as of this review; a future content update should consider moving the examples to the current Rook chart version and adjusting the Kubernetes support range and chart values accordingly.
