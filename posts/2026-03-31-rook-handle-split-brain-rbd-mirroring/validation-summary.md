# Validation Summary: How to Handle Split-Brain Scenarios in RBD Mirroring

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph RBD (RADOS Block Device)
- RBD Mirroring (journal-based)
- rbd-mirror daemon
- Rook (Ceph operator for Kubernetes)
- CephBlockPool CRD
- kubectl / Rook toolbox

## Sources Consulted
- Ceph RBD Mirroring official documentation: https://docs.ceph.com/en/reef/rbd/rbd-mirroring/
- Ceph source code (`doc/rbd/rbd-mirroring.rst` on main branch): https://github.com/ceph/ceph/blob/main/doc/rbd/rbd-mirroring.rst
- Ceph source code (`src/tools/rbd_mirror/image_replayer/journal/ReplayStatusFormatter.cc`): confirmed `entries_behind_primary` field name in modern Ceph
- Rook toolbox deployment manifest: https://github.com/rook/rook/blob/master/deploy/examples/toolbox.yaml
- Rook toolbox documentation: https://rook.io/docs/rook/latest-release/Troubleshooting/ceph-toolbox/

## Issues Found

1. **Missing `rbd mirror image resync` command in first resolution code block.** The first split-brain resolution example (keeping cluster-B's data) demoted cluster-A but did not include the required `rbd mirror image resync` command on cluster-A. Per official Ceph documentation, the rbd-mirror daemon will not automatically resync a demoted image after split-brain -- you must explicitly request resync. Added `rbd mirror image resync replicapool/myimage` to the first code block.

2. **Outdated field name `entries_behind_master` (two occurrences).** In modern Ceph versions (Pacific/Quincy and later), the JSON output field was renamed from `entries_behind_master` to `entries_behind_primary` as part of inclusive language changes. Updated the jq command in the "Preventing Split-Brain" section and the comment in the "Post-Resolution Verification" section.

## Review Notes
- The `entries_behind_primary` field and the jq pattern shown only apply to **journal-based** RBD mirroring. For **snapshot-based** mirroring (the default in modern Rook/Ceph deployments), the description field contains different metrics (`replay_state`, `bytes_per_second`, `bytes_per_snapshot`, `local_snapshot_timestamp`, `remote_snapshot_timestamp`). The post implicitly assumes journal-based mirroring, which is still valid but worth noting.
- The `rbd mirror image promote --force` command in the "How Split-Brain Occurs" section omits the pool/image argument for brevity, which is acceptable in the explanatory context but differs from the full syntax shown elsewhere in the post.
