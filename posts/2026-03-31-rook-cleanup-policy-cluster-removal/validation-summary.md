# Validation Summary: How to Set Up Cleanup Policy for Rook-Ceph Cluster Removal

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Kubernetes (CRDs, kubectl, Jobs, PVCs/PVs)
- CephCluster CRD (`ceph.rook.io/v1`)

## Sources Consulted
- Rook official teardown documentation: https://rook.io/docs/rook/latest-release/Getting-Started/ceph-teardown/
- Rook source code `pkg/apis/ceph.rook.io/v1/types.go` — CephCluster CRD type definitions for `CleanupPolicySpec`, `SanitizeDisksSpec`, `SanitizeMethodProperty`, `SanitizeDataSourceProperty`
- Rook source code `pkg/operator/ceph/cluster/cleanup.go` — cleanup job creation logic and label selectors

## Issues Found
No technical issues found.

All claims were verified:
- The `cleanupPolicy` field structure (`confirmation`, `sanitizeDisks.method`, `sanitizeDisks.dataSource`, `sanitizeDisks.iteration`, `allowUninstallWithVolumes`) matches the CRD spec exactly.
- The confirmation string `"yes-really-destroy-data"` matches the kubebuilder validation pattern `^$|^yes-really-destroy-data$`.
- Default values shown (method: quick, dataSource: zero, iteration: 1) are correct.
- The finalizer behavior preventing deletion without a cleanup policy is accurate.
- The cleanup job label selector `app=rook-ceph-cleanup` is correct per the source code (`CleanupAppName = "rook-ceph-cleanup"` with `AppLabels()` setting the `app` label).
- The step-by-step removal order matches the official teardown documentation.
- The `kubectl patch --type merge` command matches the official docs verbatim.

## Review Notes
- The cleanup jobs also carry an additional label `rook-ceph-cleanup=true` which could be used as an alternative selector, but the `app=rook-ceph-cleanup` label shown in the post is correct.
- The post correctly warns about `allowUninstallWithVolumes: true` being dangerous in production.
- The CRD deletion command using `kubectl get crd | grep rook | awk` is a common pattern but could miss CRDs if the naming convention changes in future Rook versions. This is a minor robustness concern, not a correctness issue.
