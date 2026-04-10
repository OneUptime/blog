# Validation Summary: How to Debug CephFilesystem Mount Issues in Rook

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (CephFS filesystem)
- Kubernetes (kubectl, CSI, PVC/PV, DaemonSets, Deployments)
- Ceph CSI Driver (csi-cephfsplugin, csi-cephfsplugin-provisioner)
- Ceph MDS (Metadata Server)
- Linux kernel modules (ceph module)

## Sources Consulted
- Rook CSI Drivers documentation: https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Rook CSI Common Issues troubleshooting: https://rook.io/docs/rook/v1.9/Troubleshooting/ceph-csi-common-issues/
- Rook CephFS StorageClass example: https://github.com/rook/rook/blob/master/deploy/examples/csi/cephfs/storageclass.yaml
- Rook Helm Chart values.yaml (CSI_LOG_LEVEL reference): https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/values.yaml
- kubectl rollout restart documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Kubernetes PR #99758 (label selector support for rollout restart): https://github.com/kubernetes/kubernetes/pull/99758
- Rook CephFilesystem documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/

## Issues Found
No technical issues found.

## Review Notes
- The command `kubectl rollout restart deployment -n rook-ceph -l app=rook-ceph-mds` uses the `-l` (label selector) flag with `rollout restart`, which requires Kubernetes v1.24+. Since Kubernetes 1.24 was released in May 2022, this is unlikely to be an issue for any current cluster, but it is worth noting for users on very old Kubernetes versions.
- The `apt-get install -y ceph-common` fix in Step 7 only applies to Debian/Ubuntu-based nodes. On RHEL/CentOS nodes, users would need `yum install ceph-common` instead. This is a minor omission rather than an error.
- All CSI pod labels (`app=csi-cephfsplugin`), container names (`-c csi-cephfsplugin`), deployment names (`csi-cephfsplugin-provisioner`), secret names (`rook-csi-cephfs-provisioner`, `rook-csi-cephfs-node`), and the operator configmap name (`rook-ceph-operator-config`) are verified correct per official Rook documentation and source code.
- CSI_LOG_LEVEL value of "5" is confirmed as the most verbose level (range 0-5), per the Rook Helm chart values.yaml.
- The Mermaid flowchart accurately represents a logical debugging flow for CephFS mount issues.
