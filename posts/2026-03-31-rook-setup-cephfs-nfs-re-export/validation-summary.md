# Validation Summary: How to Set Up CephFS for NFS Re-Export

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph / CephFS
- NFS-Ganesha (NFSv4 server)
- Kubernetes Services (LoadBalancer)
- Linux NFS client mounting

## Sources Consulted
- Rook CephNFS CRD documentation: https://rook.github.io/docs/rook/latest/CRDs/ceph-nfs-crd/
- Rook NFS advanced configuration: https://rook.io/docs/rook/latest-release/Storage-Configuration/NFS/nfs-advanced/
- Rook NFS operator source code (spec.go): https://github.com/rook/rook/blob/master/pkg/operator/ceph/nfs/spec.go
- Ceph NFS module documentation: https://docs.ceph.com/en/latest/mgr/nfs/
- Rook GitHub issue #8450 (removal of spec.rados): https://github.com/rook/rook/issues/8450
- Rook GitHub issue #8233 (NFS service per-instance vs unified): https://github.com/rook/rook/issues/8233

## Issues Found

1. **Removed `spec.rados` field from CephNFS CRD**: The `spec.rados` block (with `pool: nfs-ganesha` and `namespace: nfs-ns`) was deprecated and removed starting in Rook ~v1.8. Modern Rook versions automatically manage the `.nfs` RADOS pool for NFS-Ganesha configuration storage. Removed the `rados` section from the YAML example.

2. **Removed unnecessary manual RADOS pool creation commands**: The commands `ceph osd pool create nfs-ganesha 32` and `ceph osd pool application enable nfs-ganesha nfs` are unnecessary in modern Rook. The operator auto-creates the `.nfs` pool. Additionally, the pool name `nfs-ganesha` was incorrect — the NFS module hardcodes `.nfs` as the pool name. Removed the entire manual pool creation section and added a note that the operator handles this.

3. **Removed port 111 (rpcbind) from Service YAML**: Rook's NFS-Ganesha only exposes port 2049 (NFS) and optionally 9587 (metrics). Port 111 (rpcbind/portmapper) is an NFSv3 artifact and is not exposed by the NFS-Ganesha pods in Rook. Removed the rpcbind port entry.

4. **Clarified Service creation context**: Rook auto-creates per-instance ClusterIP services (e.g., `rook-ceph-nfs-my-nfs-a`). The blog's unified LoadBalancer service is a valid approach for external access but is not Rook's default. Updated the text to explain this and renamed the service to `rook-ceph-nfs-lb` to avoid confusion with Rook's auto-created services.

## Review Notes
- The `ceph nfs export create cephfs` commands use the correct named-argument syntax for Ceph Quincy/Reef/Squid.
- The `--readonly` flag for NFS exports is valid and correctly used.
- The mount command and fstab entry use correct NFSv4.1 syntax with appropriate options.
- The root squash section mentions using `ceph nfs export get` to view the configuration but does not show how to actually apply root squash settings. This could be expanded in a future update but is not technically incorrect.
- The pod anti-affinity placement configuration is correct for distributing NFS pods across nodes.
