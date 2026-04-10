# Validation Summary: How to Automate Ceph Edge Cluster Deployment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (v18.2.0 Reef)
- Kustomize (for base/overlay templating)
- Flux CD v2 (GitOps reconciliation)
- Bash scripting (bootstrap automation)

## Sources Consulted
- Kustomize `bases` deprecation notice: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/bases/
- Kustomize `resources` field reference: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/resource/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook CRD specification: https://rook.io/docs/rook/latest/CRDs/specification/
- Flux Kustomization API v1 reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Kustomization usage guide: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Rook example cluster.yaml: https://github.com/rook/rook/blob/master/deploy/examples/cluster.yaml

## Issues Found
1. **Deprecated `bases` field in Kustomize** (2 occurrences): The `bases` field in `kustomization.yaml` has been deprecated since Kustomize v2.1.0 (2019) in favor of `resources`. While `bases` still works under `kustomize.config.k8s.io/v1beta1`, it is not supported in the v1 API and emits deprecation warnings. Changed `bases` to `resources` in both the site-specific Kustomize override example and the bootstrap script heredoc.

## Review Notes
- **Ceph Reef (v18) end-of-life**: Ceph v18 (Reef) reached end-of-life in March 2026, with v18.2.8 as the final release. The post uses `quay.io/ceph/ceph:v18.2.0`. Readers deploying new clusters should consider using Ceph Squid (v19.2.x) or Tentacle (v20.2.x) with a compatible Rook version (v1.19+). The automation pattern described in the post remains valid regardless of Ceph version.
- **Single monitor for edge**: The template uses `mon.count: 1` with `allowMultiplePerNode: true`, which is appropriate for resource-constrained edge nodes but sacrifices HA. The post correctly shows overriding this to 3 for larger sites.
- All Flux Kustomization v1 API fields (`interval`, `path`, `prune`, `sourceRef`, `healthChecks`) are correct and current.
- All CephCluster CRD fields are structurally valid for `ceph.rook.io/v1`.
