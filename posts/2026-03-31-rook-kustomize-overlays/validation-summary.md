# Validation Summary: How to Set Up Rook-Ceph with Kustomize Overlays

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (v1.14.0)
- Ceph (v18.2.4 / Reef)
- Kustomize (overlays, JSON patches)
- Kubernetes (kubectl)
- ArgoCD (Application spec)
- GitOps workflow

## Sources Consulted
- Kustomize official documentation on `bases` deprecation and `resources` field usage
- Rook GitHub repository (v1.14.0 tag) for CRD, common, and operator YAML paths
- Rook-Ceph CephCluster CRD documentation for spec field validation (`cephVersion.image`, `dataDirHostPath`, `storage`, `resources`)
- Ceph container image registry at quay.io/ceph/ceph for v18.2.4 tag verification
- ArgoCD Application CRD specification for `spec.source.kustomize` supported fields

## Issues Found
1. **Deprecated `bases` field in overlay kustomization.yaml files** (staging and production): The `bases` field was deprecated in Kustomize v2.1.0 in favor of the `resources` field. While `bases` still works, it emits deprecation warnings and should not be recommended in new tutorials. Changed `bases` to `resources` in both overlay kustomization.yaml snippets.

2. **Invalid `kustomize.version` field in ArgoCD Application spec**: The `spec.source.kustomize` section of an ArgoCD Application does not support a `version` field. The Kustomize binary version is configured server-side via the `argocd-cm` ConfigMap, not per-Application. Removed the invalid `version: v4.5.7` field from the ArgoCD example.

## Review Notes
- All Rook v1.14.0 GitHub URLs for CRDs, common resources, and operator YAML are valid and accessible.
- The Ceph container image `quay.io/ceph/ceph:v18.2.4` is a valid, published image.
- The CephCluster CRD fields (`cephVersion.image`, `dataDirHostPath`, `storage.useAllNodes`, `storage.useAllDevices`, `storage.nodes`, `resources` with `mgr`/`osd` sub-keys) are all correct for Rook v1.14.
- The JSON Patch (RFC 6902) format used in the cluster-patch.yaml files is correctly structured and compatible with Kustomize's `patches` field when a `target` is specified.
- The `kubectl kustomize` commands shown are correct and follow standard usage patterns.
