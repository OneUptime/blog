# Validation Summary: How to Set preserveFilesystemOnDelete in Rook CephFS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph Operator for Kubernetes)
- Ceph (CephFS filesystem)
- Kubernetes (CRDs, kubectl)
- CephFilesystem CRD (`ceph.rook.io/v1`)

## Sources Consulted
- Rook official documentation: CephFilesystem CRD reference (https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/)
- Rook GitHub repository: `pkg/apis/ceph.rook.io/v1/types.go` — CephFilesystem and FilesystemSpec Go type definitions confirming the `preserveFilesystemOnDelete` field
- Rook GitHub repository: `pkg/operator/ceph/file/filesystem.go` — operator reconciliation logic showing how `PreserveFilesystemOnDelete` gates the `RemoveFilesystem` call
- Rook GitHub repository: `deploy/examples/filesystem.yaml` — official example CephFilesystem manifest
- Rook GitHub repository: `pkg/daemon/ceph/client/filesystem.go` — confirms `ceph fs ls` is used to list filesystems
- Rook integration tests: `tests/integration/ceph_base_file_test.go` — confirms preservation behavior after CRD deletion

## Issues Found
No technical issues found.

## Review Notes
- The YAML example omits optional fields like `requireSafeReplicaSize` and `failureDomain` that appear in the official Rook example. These have sensible defaults so their omission is correct and keeps the example focused.
- Setting `preserveFilesystemOnDelete: true` also implicitly preserves the backing pools (equivalent to `preservePoolsOnDelete: true`), per the Go source comments. The post does not mention this explicitly but its description of pool preservation behavior is accurate.
- The re-adoption workflow (reapplying the same manifest to re-manage a preserved filesystem) is supported by Rook's reconciliation logic, though the official documentation does not prominently document this pattern. The post's description is accurate.
