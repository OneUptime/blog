# Validation Summary: How to Enable Journaling Feature on RBD Images

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Ceph RBD (RADOS Block Device)
- RBD journaling feature
- RBD mirroring (journal-based)
- Rook Ceph operator
- Kubernetes StorageClass (CSI RBD provisioner)

## Sources Consulted
- Ceph official documentation: RBD Mirroring and Journaling (https://docs.ceph.com/en/latest/rbd/rbd-mirroring/)
- Ceph official documentation: RBD Image Features (https://docs.ceph.com/en/latest/man/8/rbd/)
- Ceph official documentation: RBD Configuration Reference (https://docs.ceph.com/en/latest/rbd/rbd-config-ref/)
- Rook documentation: Ceph Block Pool StorageClass (https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/)
- Cross-referenced with other blog posts in this repository that use `rbd_default_features` and `--image-feature`

## Issues Found
- **Inaccurate claim about "point-in-time recovery"**: The Overview section stated the journal enables "point-in-time recovery." This is incorrect — the RBD journal is designed for journal-based mirroring and provides crash-consistency guarantees (write ordering), not arbitrary point-in-time recovery. Point-in-time recovery is a capability provided by RBD snapshots, not the journal. Changed "point-in-time recovery" to "write-ordering guarantees that ensure data consistency after a crash."

## Review Notes
- The `rbd config pool set replicapool rbd_default_features "layering,exclusive-lock,..."` command uses string feature names rather than the numeric bitmask (e.g., 93). Both formats are supported in modern Ceph versions (Nautilus/14.x and later), so this is correct for current Rook deployments. Older Ceph versions only accept the numeric format.
- The `rbd create --image-feature` flag with comma-separated feature names is valid and consistent with usage across other posts in this blog.
- The StorageClass YAML correctly uses `rook-ceph.rbd.csi.ceph.com` as the provisioner and includes all required CSI secret references for a standard Rook deployment.
- The warning about disabling journaling breaking mirroring is accurate and a valuable operational note.
