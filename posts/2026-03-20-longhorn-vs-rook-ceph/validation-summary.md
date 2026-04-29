# Validation Summary: Longhorn vs Rook-Ceph: Kubernetes Storage Comparison

## Status
validated

## Post Type
Guide / comparison

## Technologies Covered
- Kubernetes
- Longhorn
- Rook
- Ceph
- Helm
- Kubernetes StorageClass
- Ceph RBD
- CephFS

## Sources Consulted
- Longhorn documentation: What is Longhorn? https://longhorn.io/docs/1.11.1/what-is-longhorn/
- Longhorn documentation: Install Longhorn on Kubernetes https://longhorn.io/docs/1.11.1/deploy/install/
- Longhorn documentation: ReadWriteMany (RWX) Volume https://longhorn.io/docs/1.11.1/nodes-and-volumes/volumes/rwx-volumes/
- Longhorn documentation: Storage Class Parameters https://longhorn.io/docs/1.11.1/references/storage-class-parameters/
- Longhorn documentation: Recurring Snapshots and Backups https://longhorn.io/docs/1.11.0/snapshots-and-backups/scheduling-backups-and-snapshots/
- Longhorn documentation: Best Practices https://longhorn.io/docs/1.11.1/best-practices/
- Rook documentation: Ceph Operator Helm Chart https://rook.io/docs/rook/latest-release/Helm-Charts/operator-chart/
- Rook documentation: Quickstart https://rook.io/docs/rook/latest-release/Getting-Started/quickstart/
- Rook documentation: Block Storage Overview https://rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook documentation: Ceph CSI Drivers https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Rook documentation: Ceph Dashboard https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-dashboard/
- Rook documentation: Disaster Recovery https://rook.io/docs/rook/latest/Troubleshooting/disaster-recovery/
- Rook documentation: RBD Mirroring https://rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/rbd-mirroring/
- Ceph documentation: Cache Tiering https://docs.ceph.com/en/latest/rados/operations/cache-tiering/
- CNCF: Rook project status https://www.cncf.io/projects/rook/
- CNCF: Longhorn incubating announcement https://www.cncf.io/blog/2021/11/04/longhorn-brings-cloud-native-distributed-storage-to-the-cncf-incubator/
- Kubernetes documentation: Storage Classes https://kubernetes.io/docs/concepts/storage/storage-classes/

## Issues Found
- Longhorn RWX support was described as unavailable. I updated the comparison table because current Longhorn documentation supports RWX volumes via share-manager pods and NFS.
- The Rook-Ceph backup row claimed `Yes (via Velero)`, which overstates built-in parity with Longhorn's S3 backup flow. I changed this to `Via external tooling` and adjusted the backup/DR lead-in so it matches current Rook/Ceph snapshot and mirroring documentation.
- The Rook-Ceph RBD `StorageClass` example omitted current secret fields used in the official example. I added the `controller-expand`, `controller-publish`, and `node-stage` secret references plus `csi.storage.k8s.io/fstype: ext4`.
- The performance section referenced SSD caching and tiered storage as if they were current tuning recommendations. I replaced that wording with dedicated OSD configuration and Ceph tuning language because upstream Ceph documents cache tiering as deprecated and not recommended for new deployments.
- The Longhorn node-count guidance implied a 1-3 node limit. I changed it to reflect that Longhorn can run on small clusters while production best practices still recommend 3 nodes, and clarified the Rook row as a standard production deployment expectation.
- The Rancher integration row for Rook-Ceph said `Via StorageClass`, which is not really a Rancher-specific integration model. I changed it to `Standard Kubernetes integration`.

## Review Notes
- Validated against current official documentation available on April 29, 2026.
- The post is version-agnostic, but the referenced projects have moving compatibility windows. At review time, Longhorn documentation was checked against the 1.11.1 docs set and Rook against current latest/latest-release docs.
- The Ceph Dashboard is available, but external access and authentication still require additional configuration beyond the simple comparison table.
