# Validation Summary: How to Use Ceph with containerd for Kubernetes Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- containerd (container runtime)
- Kubernetes (container orchestration)
- CSI (Container Storage Interface)
- RBD (RADOS Block Device)
- ceph-csi (Ceph CSI driver)

## Sources Consulted
- Rook official documentation for StorageClass and CSI configuration: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Kubernetes CSI documentation: https://kubernetes-csi.github.io/docs/
- Kubernetes DaemonSet API reference: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/daemon-set-v1/
- Kubernetes `kubectl debug` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes Pod spec requirements (containers vs initContainers): https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/
- containerd and CRI documentation: https://kubernetes.io/docs/concepts/architecture/cri/

## Issues Found

1. **`kubectl debug` command missing `chroot /host`**: The command `kubectl debug node/node1 -it --image=ubuntu -- crictl version` would fail because `crictl` is a host binary, not available inside the Ubuntu debug container. When using `kubectl debug node/`, the host filesystem is mounted at `/host`, so the command must use `chroot /host crictl version` to access host-level tools. Fixed by adding `chroot /host` before `crictl version`.

2. **DaemonSet YAML was invalid and would fail to apply**: The DaemonSet manifest was missing three required elements:
   - `spec.selector.matchLabels` — required field for DaemonSet to match pods.
   - `spec.template.metadata.labels` — required to match the selector.
   - `spec.template.spec.containers` — a Pod must have at least one regular container; `initContainers` alone is not a valid pod spec. Added a `pause` container (`registry.k8s.io/pause:3.9`) as the main container, which is the standard pattern for pods whose only real work happens in init containers.

## Review Notes
- The StorageClass YAML correctly matches the Rook-Ceph official examples, including the CSI secret names (`rook-csi-rbd-provisioner`, `rook-csi-rbd-node`) and provisioner name (`rook-ceph.rbd.csi.ceph.com`).
- The explanation of how CSI interacts with containerd via kubelet is accurate at a high level, though it's worth noting that CSI volume operations (attach/mount) go through the kubelet's volume manager directly, not through the CRI. The CRI is used to manage the CSI driver containers themselves.
- The `echo "rbd" >> /etc/modules-load.d/rbd.conf` command could append duplicates if run multiple times; in practice this is harmless but a more robust approach would check for existing entries first.
