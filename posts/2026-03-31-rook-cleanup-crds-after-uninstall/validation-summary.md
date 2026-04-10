# Validation Summary: How to Clean Up Rook-Ceph CRDs After Uninstallation

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook-Ceph (v1.14.0)
- Kubernetes (CRDs, RBAC, kubectl)
- Helm (uninstall behavior)

## Sources Consulted
- Helm CRD Best Practices documentation: https://helm.sh/docs/chart_best_practices/custom_resource_definitions/
- Rook v1.14.0 CRD manifest: https://raw.githubusercontent.com/rook/rook/v1.14.0/deploy/examples/crds.yaml
- Rook v1.14.0 common.yaml (RBAC definitions): https://github.com/rook/rook/blob/v1.14.0/deploy/examples/common.yaml
- Rook Helm chart ClusterRole templates: https://github.com/rook/rook/tree/v1.14.0/deploy/charts/rook-ceph/templates/
- Kubernetes apiextensions source (CRD finalizer constant): https://pkg.go.dev/k8s.io/apiextensions-apiserver/pkg/apis/apiextensions
- Rook v1.14.0 GitHub release: https://github.com/rook/rook/releases/tag/v1.14.0

## Issues Found
1. **Missing CRD `cephcosidrivers.ceph.rook.io`**: The CRD list in both the example output and the individual deletion commands was missing `cephcosidrivers.ceph.rook.io`, which is present in the Rook v1.14.0 `crds.yaml` manifest. Added it to both the example CRD listing and the individual `kubectl delete crd` commands.

2. **Incorrect RBAC label selector**: The ClusterRole/ClusterRoleBinding cleanup commands used the label `-l operator.rook.io/core-cluster=rook-ceph`, which does not exist in the Rook v1.14 codebase. The actual labels on Rook RBAC resources are `operator=rook` and `storage-backend=ceph`. Changed to `-l operator=rook,storage-backend=ceph`.

## Review Notes
- The RBAC cleanup in Step 4 only covers a subset of Rook ClusterRoles. Additional ClusterRoles exist (e.g., `rook-ceph-global`, `rook-ceph-mgr-cluster`, `rook-ceph-mgr-system`, `rook-ceph-object-bucket`, `rook-ceph-osd`, and several CSI-related ones). However, the label-based deletion command will catch most of these, and the post is not incorrect as written -- it just doesn't enumerate every individual resource.
- The `kubectl delete --force --grace-period=0` approach for stuck resources in Step 3 is a valid last resort but can leave orphaned state in the cluster. The post correctly presents it as a secondary option after trying to delete the resource normally.
- Rook v1.14.0 was released April 3, 2025, confirming the version reference is valid and current.
