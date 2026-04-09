# Validation Summary: How to Fix Rook CSI Pods Not Starting

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (v1.13.x referenced)
- Ceph
- Kubernetes CSI (Container Storage Interface)
- Kubernetes (kubectl, DaemonSets, Deployments, PVCs, RBAC, ConfigMaps)
- MicroK8s (mentioned for alternate kubelet path)

## Sources Consulted
- Rook v1.13.0 operator.yaml: https://raw.githubusercontent.com/rook/rook/v1.13.0/deploy/examples/operator.yaml
- Rook v1.13.0 common.yaml (RBAC definitions): https://raw.githubusercontent.com/rook/rook/v1.13.0/deploy/examples/common.yaml
- Rook CSI troubleshooting documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-csi-common-issues/
- Rook CSI RBD plugin DaemonSet template (source code)

## Issues Found

1. **Incorrect RBAC ClusterRole names**: The post listed `rook-ceph-csi-nodeplugin` and `rook-ceph-csi-provisioner-role` as ClusterRole names. The actual names in Rook v1.13 are `rbd-csi-nodeplugin` and `rbd-external-provisioner-runner`. Fixed to use correct names.

2. **Wrong URL for reapplying RBAC resources**: The post pointed to `deploy/operator.yaml` for reapplying RBAC, but the RBAC resources (ClusterRoles, ClusterRoleBindings, ServiceAccounts) are defined in `deploy/examples/common.yaml`. Fixed to point to the correct file.

3. **Misleading CSI image grep pattern**: The grep command used `csi_image\|CSI_IMAGE` but the actual ConfigMap keys use the `ROOK_CSI_` prefix (e.g., `ROOK_CSI_CEPH_IMAGE`, `ROOK_CSI_REGISTRAR_IMAGE`). Fixed grep pattern to `ROOK_CSI_.*IMAGE`.

4. **Wrong ConfigMap key for kubelet directory path**: The post used `CSI_KUBELET_DIR_PATH` but the correct key is `ROOK_CSI_KUBELET_DIR_PATH`. Using the wrong key would be silently ignored by the operator. Fixed to use the correct key name.

5. **Incomplete socket registration path**: The post showed checking for a socket at `/var/lib/kubelet/plugins_registry/rook-ceph.rbd.csi.ceph.com` but the actual registration socket file is `/var/lib/kubelet/plugins_registry/rook-ceph.rbd.csi.ceph.com-reg.sock`. Fixed to include the `-reg.sock` suffix.

## Review Notes
- The post references Rook v1.13.0 specifically in the `common.yaml` URL. Users on different Rook versions should adjust the version in the URL accordingly.
- The CSI driver name `rook-ceph.rbd.csi.ceph.com` assumes the operator is deployed in the `rook-ceph` namespace. If deployed in a different namespace, the driver name prefix changes to match that namespace.
- The ServiceAccount name `rook-csi-rbd-plugin-sa` was verified as correct.
- All kubectl commands, YAML manifests, and the test PVC example are syntactically correct.
- The CephFS equivalents of RBAC resources (`cephfs-csi-nodeplugin`, `cephfs-external-provisioner-runner`) are not mentioned but could be useful for CephFS users. This is not an error, just a potential enhancement.
