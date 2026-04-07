# Validation Summary: How to Upgrade the Rook Operator from v1.18 to v1.19

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system)
- Kubernetes (container orchestration)
- Helm (Kubernetes package manager)
- kubectl CLI

## Sources Consulted
- Rook official upgrade documentation: https://rook.io/docs/rook/latest/Upgrade/rook-ceph-upgrade/
- Rook GitHub repository structure: https://github.com/rook/rook/tree/master/deploy/examples
- Rook Helm chart documentation: https://rook.io/docs/rook/latest/Helm-Charts/operator-chart/
- Ceph container image registry: https://quay.io/repository/ceph/ceph
- kubectl reference documentation: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
1. **`watch` with `-it` flags on `kubectl exec`** (line 109): The command `watch kubectl -n rook-ceph exec -it <toolbox-pod> -- ceph status` used `-it` flags. The `-t` flag allocates a pseudo-TTY, which does not work when the command is wrapped in `watch` (since `watch` is not a terminal). Removed `-it` so the command reads `watch kubectl -n rook-ceph exec <toolbox-pod> -- ceph status`.

## Review Notes
- The post references Rook v1.19.0 and Ceph v19.2.0, which are future versions. The upgrade procedure, manifest paths, Helm chart names, and general workflow are consistent with the established Rook upgrade patterns from prior releases.
- The Helm repo name `rook-release` and chart name `rook-ceph` are correct per current Rook documentation.
- The manifest download paths (`deploy/examples/crds.yaml`, `common.yaml`, `operator.yaml`) follow the standard Rook repository layout.
- The upgrade order (CRDs first, then common/RBAC, then operator) is correct and important.
- The distinction between operator upgrade and Ceph version upgrade is accurately explained.
- Rollback guidance is sound: operator rollback is safe if the Ceph version was not changed.
