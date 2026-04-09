# Validation Summary: How to Enable Image-Level RBD Mirroring Mode

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RBD (RADOS Block Device)
- RBD Mirroring (journal-based and snapshot-based)
- Kubernetes CRDs (CephBlockPool, VolumeReplication)
- kubectl CLI

## Sources Consulted
- Ceph RBD Mirroring official documentation: https://docs.ceph.com/en/reef/rbd/rbd-mirroring/
- Rook RBD Mirroring documentation: https://rook.io/docs/rook/v1.17/Storage-Configuration/Block-Storage-RBD/rbd-mirroring/
- Ceph RBD Mirroring reference (Proxmox): https://pve.proxmox.com/wiki/Ceph_RBD_Mirroring
- IBM Ceph documentation on journal-based and snapshot-based mirroring: https://www.ibm.com/docs/en/storage-ceph/6?topic=devices-overview-journal-based-snapshot-based-mirroring

## Issues Found

1. **Incorrect snapshot schedule command syntax (Step 4)**: The blog used `rbd mirror image snapshot schedule add replicapool/app-data 1h`. The correct command is `rbd mirror snapshot schedule add --pool replicapool --image app-data 1h`. There is no `image` subcommand between `mirror` and `snapshot schedule`; the pool and image are specified via flags.

2. **Non-existent `rbd mirror image list` command (Step 5)**: The blog used `rbd mirror image list replicapool`, but `list` is not a valid subcommand of `rbd mirror image`. The valid subcommands are: demote, disable, enable, promote, resync, snapshot, status. Replaced with `rbd mirror pool status replicapool --verbose`, which shows per-image mirroring status. Also updated the sample output to reflect the actual output format of this command.

3. **Fabricated Rook annotation for PVC mirroring (Step 7)**: The blog showed a `rook.io/volumeAttributes: '{"mirroring":"enabled"}'` annotation on a PVC, which is not a documented or valid Rook annotation. The documented Kubernetes-native approach for managing RBD mirroring at the PVC level uses VolumeReplication CRDs from the CSI Addons project. Replaced the entire step with the correct VolumeReplicationClass and VolumeReplication CRD approach.

## Review Notes
- The core concepts (image-level vs pool-level mirroring, journal vs snapshot modes) are explained accurately.
- The CephBlockPool CRD configuration in Step 2 is correct and matches Rook documentation.
- The commands for enabling/disabling mirroring on individual images (Steps 3, 4, 6) use correct syntax.
- The claim that snapshot-based mirroring does not require the journaling feature is accurate.
- The VolumeReplication API version (`replication.storage.openshift.io/v1alpha1`) may evolve as the CSI Addons project matures; readers should check for the latest API version.
