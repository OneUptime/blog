# Validation Summary: How to Manage Rook-Ceph with ArgoCD Application Sets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ArgoCD ApplicationSets
- Rook-Ceph
- Kubernetes
- Kustomize (overlays/base structure)
- GitOps workflows

## Sources Consulted
- ArgoCD ApplicationSet documentation (generators, template fields, sync options) — https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/
- ArgoCD Cluster Generator documentation — https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- ArgoCD List Generator documentation — https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-List/
- ArgoCD Sync Options documentation — https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- ArgoCD Sync Waves documentation — https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- ArgoCD ApplicationSet CRD source (argoproj/argo-cd on GitHub) for API version verification

## Issues Found
1. **Missing `destination` field in cluster generator template** (line ~94-98): The cluster generator template snippet was missing the required `destination` field. Without it, generated Applications would not know which cluster to deploy to, which defeats the purpose of the cluster generator. Added `destination.server: "{{server}}"` and `destination.namespace: rook-ceph` to match the pattern established in the list generator example above it.

## Review Notes
- The post uses legacy ApplicationSet template syntax (`{{name}}`, `{{server}}`) rather than Go template syntax (`{{.name}}`, `{{.server}}`). This is valid when `goTemplate` is not explicitly set to `true` (it defaults to `false`). However, newer ArgoCD documentation examples increasingly use `goTemplate: true` with dot-prefixed variables. This is not an error but worth noting for future updates.
- The `argoproj.io/v1alpha1` API version is confirmed correct — there is no newer API version for ApplicationSet as of current ArgoCD releases.
- The sync wave ordering (CRDs at -2, operator at -1, cluster CR at 0) is a sound approach for Rook deployment ordering.
- `ServerSideApply=true` is a valid and recommended sync option, particularly appropriate for Rook CRDs which can be large.
- The `prune: false` setting in the automated sync policy is a sensible default for storage infrastructure to prevent accidental deletion of Ceph resources.
