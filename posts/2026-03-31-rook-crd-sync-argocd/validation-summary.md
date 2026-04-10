# Validation Summary: How to Handle Rook CRD Sync Issues in ArgoCD

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Rook (v1.14.0)
- Ceph
- ArgoCD (Argo CD)
- Kubernetes (CRDs, server-side apply)
- kubectl
- GitOps

## Sources Consulted
- ArgoCD Sync Options Documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- ArgoCD Server-Side Apply Documentation: https://argo-cd.readthedocs.io/en/latest/proposals/server-side-apply/
- ArgoCD Sync Waves Documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- ArgoCD Diff Customization (ignoreDifferences): https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/
- Kubernetes Server-Side Apply Documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Kubernetes CRD Documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Rook GitHub Releases: https://github.com/rook/rook/releases
- kubectl annotation size limit issue: https://github.com/kubernetes/kubectl/issues/712

## Issues Found
1. **`Replace=true` combined with `ServerSideApply=true` in Issue 1 example**: These sync options are contradictory. When both are set, `Replace=true` takes precedence, causing ArgoCD to delete and recreate the resource instead of using server-side apply. For CRDs this is dangerous — deleting a CRD cascade-deletes all its custom resources. The stated goal of the section is to use server-side apply to avoid the annotation size limit, so `Replace=true` was removed. `ServerSideApply=true` alone correctly solves the annotation size problem.

## Review Notes
- Rook v1.14.0 is used throughout the examples. This version exists and is still supported, but newer versions (v1.15.x) are available. The path `deploy/examples/crds.yaml` is correct for v1.14.
- The `sync-wave` annotation on the Application resource (Issue 2) is valid in an app-of-apps pattern but would have no effect if the Application is not managed by another Application. The post doesn't explicitly mention this context.
- All kubectl flags (`--server-side`, `--field-manager`, `--force-conflicts`) are verified correct.
- All ArgoCD configuration syntax (`syncOptions`, `ignoreDifferences` with `jsonPointers`, `Prune=false` annotation) is verified correct.
- The `apiextensions.k8s.io` API group in `ignoreDifferences` is correct — the `group` field takes the API group name without the version suffix.
