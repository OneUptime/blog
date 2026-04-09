# Validation Summary: How to Set Up Ganesha NFS with CephFS Backend in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph / CephFS
- NFS Ganesha
- Kubernetes (CRDs, Pods, PVCs, StorageClasses)
- NFS CSI Driver (rook-ceph.nfs.csi.ceph.com)

## Sources Consulted
- Rook official documentation and example manifests (https://rook.io/docs/rook/latest/)
- Rook source code: `deploy/examples/nfs.yaml` and `deploy/examples/csi/nfs/storageclass.yaml` on master branch
- Rook NFS CephNFS CRD spec history (v1.8 through current)
- Rook source code: `pkg/operator/ceph/nfs/spec.go` for pod label verification
- Ceph official documentation for `ceph nfs export create` CLI syntax (https://docs.ceph.com/en/latest/cephadm/services/nfs/)

## Issues Found

1. **Deprecated `spec.rados` field in CephNFS CR (Step 2):** The blog included `spec.rados.pool` and `spec.rados.namespace` fields in the CephNFS YAML. These fields were removed starting in Rook v1.9 (Ceph v16+). Current Rook versions manage the NFS RADOS configuration automatically via the built-in `.nfs` pool. Removed the entire `rados` block from the CephNFS spec.

2. **Incorrect NFS CSI StorageClass parameter name (Step 6):** The blog used `nfsClusterID: my-nfs` as a StorageClass parameter. The correct parameter name per official Rook examples is `nfsCluster`. Changed `nfsClusterID` to `nfsCluster`.

3. **Missing `server` parameter in NFS StorageClass (Step 6):** The StorageClass was missing the `server` parameter, which is included in official Rook NFS CSI examples. Added `server: rook-ceph-nfs-my-nfs-a` to the StorageClass parameters.

4. **Missing `sudo` for `/etc/fstab` write (External VM Mount):** The `echo ... >> /etc/fstab` command would fail without root privileges since shell redirection (`>>`) runs in the current user's context, not under `sudo`. Changed to `echo ... | sudo tee -a /etc/fstab`.

## Review Notes
- The `ceph nfs export create cephfs` command uses the older positional argument syntax. Current Ceph documentation recommends named arguments (`--cluster-id`, `--pseudo-path`, `--fsname`), but the positional form still works. Not changed since both syntaxes are functional.
- The architecture diagram correctly shows the data flow from CephFilesystem through CephNFS/Ganesha pods to both in-cluster and external clients.
- The CephFilesystem CR spec is correct and follows current Rook conventions.
- The direct NFS volume mount in Pod spec (Step 5) correctly uses the Kubernetes DNS service name.
- The external VM mount section uses a ClusterIP address (10.96.5.200), which is only accessible from within the Kubernetes cluster network. The post states "in the same network" but readers should be aware that ClusterIP services are not directly routable from outside the cluster without additional networking (e.g., NodePort, LoadBalancer, or MetalLB).
