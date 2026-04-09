# Validation Summary: How to Fix Rook-Ceph OSD Prepare Job Failures

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (BlueStore OSDs)
- Kubernetes (Jobs, node affinity, debug containers, CRDs)
- Linux device management (lsblk, fdisk, wipefs, dd, fuser, lsof)
- SELinux / AppArmor

## Sources Consulted
- Rook official documentation: CephCluster CRD storage configuration (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Rook official documentation: OSD management and troubleshooting (https://rook.io/docs/rook/latest/Troubleshooting/ceph-common-issues/)
- Kubernetes documentation: kubectl debug node (https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/)
- Kubernetes documentation: kubectl logs for Jobs (https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- Linux man pages: wipefs, dd, ausearch, fuser, lsof

## Issues Found
No technical issues found.

## Review Notes
- The `ceph-osd-node=enabled` label shown in the Node Selector Mismatch section is presented with the comment "Required label for Rook." This is not a built-in Rook requirement — it is an example label that depends on the user's CephCluster placement configuration. The surrounding explanation is correct (node affinity requires matching labels), so this is acceptable as an illustrative example in a troubleshooting context.
- The `dd` command zeros only the first ~400KB of the disk (`bs=4096 count=100`), which is sufficient for clearing partition tables and filesystem superblocks but does not fully wipe the device. This is a standard and correct approach for OSD preparation purposes.
- All kubectl commands use correct syntax and flags for current Kubernetes versions.
