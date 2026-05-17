# Validation Summary: How to Configure ReadWriteMany (RWX) Storage on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (immutable Kubernetes OS)
- Kubernetes PersistentVolume access modes
- NFS CSI driver (`csi-driver-nfs`)
- nfs-ganesha-server-and-external-provisioner / `itsthenetwork/nfs-server-alpine`
- Longhorn (distributed block storage with RWX via share-manager/NFS)
- Rook-Ceph / CephFS
- Helm
- `talosctl`
- `fio` (storage benchmarking)

## Sources Consulted
- Kubernetes PV access modes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes
- NFS CSI driver Helm chart docs: https://github.com/kubernetes-csi/csi-driver-nfs/tree/master/charts
- NFS CSI driver StorageClass parameters: https://github.com/kubernetes-csi/csi-driver-nfs/blob/master/docs/driver-parameters.md
- Longhorn on Talos Linux docs: https://longhorn.io/docs/latest/advanced-resources/os-distro-specific/talos-linux-support/
- Longhorn installation requirements: https://longhorn.io/docs/latest/deploy/install/
- Talos system extensions / Image Factory: https://factory.talos.dev/
- Rook-Ceph documentation: https://rook.io/docs/rook/latest-release/
- Rook CephFS CSI provisioner naming: https://rook.io/docs/rook/latest-release/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- fio documentation: https://fio.readthedocs.io/

## Issues Found

1. **Missing ReadWriteOncePod access mode** — The post stated Kubernetes defines "three access modes" for PVs. Since 1.22 (GA in 1.29) there are four, including `ReadWriteOncePod` (RWOP). Updated the list to four modes and added an RWOP bullet. Also clarified the RWO description so the reader understands multiple pods on the same node can still share an RWO volume — this is what distinguishes RWO from RWOP.

2. **Incorrect Longhorn sysctl requirement** — The Talos machine config snippet set `vm.overcommit_memory: "1"`, attributed to Longhorn. This is a Redis convention, not a Longhorn requirement, and is not listed in the official Longhorn or Talos-Longhorn docs. Removed it from the example.

3. **Missing the real Talos requirements for Longhorn** — The post said "make sure your Talos Linux nodes have the required kernel modules" but did not name them. The official Longhorn-on-Talos docs require the `siderolabs/iscsi-tools` system extension (provides `iscsid`/`iscsiadm` and the `iscsi_tcp` kernel module) and, for Longhorn v1.5+, the `siderolabs/util-linux-tools` extension (for `nsenter` and `fstrim`). These are installed at image build time via the Talos Image Factory, not via machine config. Replaced the vague kernel-modules sentence with the actual extension requirements.

4. **Headless service for in-cluster NFS** — The in-cluster NFS Service used `clusterIP: None` (headless). A headless service returns the pod IP directly via DNS, which loses the stable virtual IP that NFS clients (including the CSI driver) generally expect, and breaks transparently on pod rescheduling. Headless services are typically reserved for StatefulSets that need per-pod DNS. Removed the `clusterIP: None` line so the service falls back to a normal ClusterIP, which is the conventional pattern for a single-replica NFS Deployment.

## Review Notes

- The post does not show creating a `CephCluster` CR before the `CephFilesystem` / StorageClass in Option 3, although it tells the reader to do so in the prose. Readers will need to consult the Rook-Ceph docs for the cluster definition (and the StorageClass references CSI secrets — `rook-csi-cephfs-provisioner`, `rook-csi-cephfs-node` — that are only created once a healthy CephCluster is running). Left as-is since the post is a high-level overview and the user is directed to create those resources.
- The in-cluster NFS Deployment is a `Deployment` (not `StatefulSet`) with a single replica and no anti-affinity. Production NFS servers usually want a `StatefulSet` for stable identity and dedicated PV backing. This is fine for a tutorial example.
- The post correctly notes that the kubelet `extraMounts` example uses `/var/lib/longhorn`. For Talos v1.10+, the official Longhorn-on-Talos guide also documents an alternative `UserVolumeConfig`-based path at `/var/mnt/longhorn`. Either approach works on current Talos; no change made.
- The NFS CSI Helm install command pulls from the `master` branch of the chart repo. Pinning to a released chart version (`--version`) would be more reproducible for production but is not technically wrong.
- The Longhorn StorageClass uses `nfsOptions: "vers=4.1,hard"`, which is a valid optional parameter; Longhorn's share-manager will work with defaults if it is omitted.
