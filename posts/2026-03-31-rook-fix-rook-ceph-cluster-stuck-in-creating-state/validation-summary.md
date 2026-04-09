# Validation Summary: How to Fix Rook-Ceph Cluster Stuck in Creating State

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Kubernetes (kubectl, pods, deployments, NetworkPolicy)

## Sources Consulted
- Rook official troubleshooting docs: https://rook.io/docs/rook/latest/Troubleshooting/ceph-common-issues/
- Rook official teardown docs: https://rook.io/docs/rook/latest/Getting-Started/ceph-teardown/
- Rook monitor health docs: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-mon-health/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.28/#networkpolicy-v1-networking-k8s-io

## Issues Found

1. **Fabricated annotation in Step 5**: The post referenced a `rook.io/do-not-reconcile` annotation with a kubectl command to remove it as a way to trigger reconciliation. This annotation does not exist in the Rook project documentation or source code. Removed the fabricated annotation command and kept only the verified approach (restarting the operator with `kubectl rollout restart`).

2. **Incorrect OSD device wipe command in Step 6**: The post used `wipefs --all /dev/sdb` to wipe OSD devices. The official Rook teardown documentation recommends `sgdisk --zap-all` followed by `dd if=/dev/zero` to properly wipe devices. `wipefs` only removes filesystem/partition-table signatures, which may not be sufficient for Ceph OSD cleanup. Replaced with the official `sgdisk --zap-all` + `dd` approach.

## Review Notes
- The cleanup procedure in Step 6 is a simplified version of the full Rook teardown process. The official docs also recommend setting a `cleanupPolicy` on the CephCluster CR before deletion and mention automated cleanup jobs. The simplified version shown is adequate for a troubleshooting guide focused on a cluster that never fully initialized.
- All kubectl commands, pod labels (`app=rook-ceph-operator`, `app=rook-ceph-mon`), port numbers (6789, 3300), and the NetworkPolicy YAML are correct.
- The `dataDirHostPath` default of `/var/lib/rook` is accurate.
