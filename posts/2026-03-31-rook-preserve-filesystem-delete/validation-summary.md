# Validation Summary: How to Set preserveFilesystemOnDelete in Rook CephFilesystem

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (CephFS / shared filesystem)
- Kubernetes (CRDs, kubectl)
- CephFilesystem CRD (`ceph.rook.io/v1`)

## Sources Consulted
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Rook GitHub CephFilesystem CRD source: https://github.com/rook/rook/blob/master/Documentation/CRDs/Shared-Filesystem/ceph-filesystem-crd.md
- Rook Filesystem Storage overview: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Rook GitHub issue #10466 (preservePoolsOnDelete behavior): https://github.com/rook/rook/issues/10466
- Kubernetes kubectl patch documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/

## Issues Found
No technical issues found.

All verified claims:
- `preserveFilesystemOnDelete` field exists under `spec` in the CephFilesystem CRD — correct.
- Default value is `false` — correct.
- When set to `true`, deleting the CR preserves the underlying Ceph filesystem while removing MDS pods — correct.
- When set to `false`, deleting the CR destroys the Ceph filesystem and all data — correct.
- apiVersion `ceph.rook.io/v1` is correct for CephFilesystem resources.
- MDS pod label `app=rook-ceph-mds` is correct.
- `kubectl patch --type merge` works for patching this field on an existing CR.
- Re-applying the same CephFilesystem spec after deletion reconnects to the preserved filesystem.
- YAML structure and field placement in all code examples are accurate.

## Review Notes
- The older `preservePoolsOnDelete` field has been deprecated in favor of `preserveFilesystemOnDelete`. The post correctly uses only the current field name. If targeting older Rook versions (pre-1.8), readers may need to use the deprecated field instead.
- The mermaid flowchart accurately represents the deletion behavior.
- All kubectl commands use correct syntax and flags.
