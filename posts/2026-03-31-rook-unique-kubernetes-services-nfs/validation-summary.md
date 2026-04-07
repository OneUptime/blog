# Validation Summary: How to Create Unique Kubernetes Services per NFS Server in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph NFS (NFS-Ganesha)
- Kubernetes Services (ClusterIP, LoadBalancer)
- CephNFS Custom Resource Definition

## Sources Consulted
- Rook CephNFS documentation: https://rook.io/docs/rook/latest/Storage-Configuration/NFS/nfs/
- Rook CephNFS CRD reference: https://rook.io/docs/rook/latest/CRDs/ceph-nfs-crd/
- Ceph NFS management documentation: https://docs.ceph.com/en/latest/cephadm/services/nfs/
- NFS-Ganesha project documentation

## Issues Found

1. **Removed deprecated `spec.rados` section from CephNFS CR**: The `rados` block with `pool`, `namespace`, and `object` fields was removed from the CephNFS CRD in Rook v1.10+. Rook now handles RADOS pool configuration automatically. Removed the entire `rados` section from the example YAML.

2. **Incorrect pod selector label for external Service**: The post used `instance: "0"` as the label selector to target a specific NFS pod. Rook actually uses `ceph_daemon_id` (e.g., `ceph_daemon_id: "my-nfs-0"`) to identify individual NFS daemon pods. Updated the selector and descriptive text accordingly.

3. **Invalid `ganesha_mgr status` command**: The `ganesha_mgr status` command is not a standard tool available in Rook's NFS-Ganesha containers. Replaced with `ceph nfs cluster info my-nfs`, which is the correct Ceph CLI command for checking NFS cluster status from within the pod.

## Review Notes
- The overall architecture explanation (one Service per NFS pod for stateful session affinity) is accurate and well-explained.
- The port 111 (rpcbind) in the external LoadBalancer Service is only needed for NFSv3 clients. Rook's NFS-Ganesha defaults to NFSv4, where only port 2049 is required. This is not incorrect but could be noted in a future update.
- The mount examples using ClusterIP addresses (10.96.x.x) would only work from within the Kubernetes cluster network. External clients would need LoadBalancer or NodePort IPs. The post's context makes this clear enough.
