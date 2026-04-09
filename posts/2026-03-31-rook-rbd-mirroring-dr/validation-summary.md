# Validation Summary: How to Configure RBD Mirroring for Disaster Recovery in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RBD (RADOS Block Device)
- Ceph RBD Mirroring (journal and snapshot modes)
- Kubernetes (CRDs, StorageClass, Secrets, PVCs)
- CephBlockPool and CephRBDMirror CRDs

## Sources Consulted
- Rook RBD Mirroring documentation (v1.9, v1.10, v1.17): https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/rbd-mirroring/
- Rook CephBlockPool CRD documentation: https://www.rook.io/docs/rook/v1.17/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook v1.4.0 release notes (CephRBDMirror CRD introduction): https://github.com/rook/rook/releases/tag/v1.4.0
- Ceph RBD Mirroring documentation (Reef): https://docs.ceph.com/en/reef/rbd/rbd-mirroring/
- ceph-csi RBD StorageClass example: https://github.com/ceph/ceph-csi/blob/devel/examples/rbd/storageclass.yaml
- ceph-csi replication controller source (VolumeReplication parameters): https://github.com/ceph/ceph-csi/blob/devel/internal/csi-addons/rbd/replication.go
- rbd(8) man page for mirror subcommands: https://manpages.debian.org/unstable/ceph-common/rbd.8.en.html

## Issues Found

1. **Invalid StorageClass mirroring parameters (Step 5)**: The original post included `mirroringMode: snapshot`, `schedulingInterval: 1h`, and `schedulingStartTime: "00:00:00-05:00"` as StorageClass parameters for the `rook-ceph.rbd.csi.ceph.com` provisioner. These are NOT valid ceph-csi StorageClass parameters and would be silently ignored. These parameter names exist in the ceph-csi codebase but are used internally by the CSI-Addons VolumeReplication controller, not the StorageClass provisioner. **Fix**: Replaced the entire Step 5 with the correct approach for snapshot-based mirroring: enabling it per-image using `rbd mirror image enable <pool>/<image> snapshot`, with snapshot schedules configured on the CephBlockPool CRD.

2. **Invalid `rbd mirror pool peer list` command**: The `rbd mirror pool peer list` subcommand does not exist. Valid `rbd mirror pool peer` subcommands are: `add`, `remove`, `set`, `bootstrap create`, and `bootstrap import`. **Fix**: Changed to `rbd mirror pool info replicapool`, which displays mirroring configuration including peer details.

3. **Incorrect Rook version prerequisite**: The post stated "Rook v1.7+ for CephRBDMirror CRD support". The CephRBDMirror CRD was introduced in Rook v1.4.0, as confirmed by the v1.4.0 release notes. **Fix**: Changed to "Rook v1.4+".

## Review Notes
- The bootstrap peer secret creation includes a `pool` key (`--from-literal=pool=replicapool`) alongside the `token` key. This is consistent with Rook's documentation for manually-created import secrets and is correct.
- The post covers both journal-based and snapshot-based mirroring modes. For users who want all images in a pool mirrored automatically (without per-image enablement), they should use `mirroring.mode: pool` instead of `mirroring.mode: image` in the CephBlockPool spec. This is now mentioned in the corrected Step 5.
- The failover procedure shows `rbd mirror image promote --force` which is appropriate for disaster recovery when the primary is unreachable. In a planned migration scenario, users should first demote the image on the primary cluster before promoting on the secondary.
