# Validation Summary: How to Migrate Ceph from One Datacenter to Another

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Ceph (distributed storage)
- Rook (Ceph operator for Kubernetes)
- RGW (RADOS Gateway) multi-site sync
- RBD (RADOS Block Device) mirroring
- CephFS (Ceph Filesystem) snapshot mirroring
- radosgw-admin CLI
- rbd CLI
- rsync

## Sources Consulted
- Ceph Multi-Site Documentation (Reef): https://docs.ceph.com/en/reef/radosgw/multisite/
- RBD Mirroring Documentation (Reef): https://docs.ceph.com/en/reef/rbd/rbd-mirroring/
- CephFS Mirroring Documentation: https://docs.ceph.com/en/reef/dev/cephfs-mirroring/
- ceph-diff-sorted man page: https://docs.ceph.com/en/latest/man/8/ceph-diff-sorted/
- radosgw-admin man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/

## Issues Found

1. **Misleading comment on `realm pull` command (line 37-42)**: The comment said "Source cluster - export realm" but `radosgw-admin realm pull` is run on the **destination** cluster to pull the realm configuration from the source. Fixed by splitting the code block into two comments: "Source cluster - list existing realms" for `realm list`, and "Destination cluster - pull realm from source" for `realm pull`.

2. **`rbd mirror image enable` missing required mode argument (line 68)**: The command `rbd mirror image enable mypool/myvolume` was missing the mandatory mirroring mode. In current Ceph versions (Pacific, Quincy, Reef), the mode (`journal` or `snapshot`) is required. Fixed by adding `snapshot` as the mode argument.

3. **Fabricated `ceph-diff-stream` command (line 95)**: The command `ceph-diff-stream source-pool dest-pool` does not exist in Ceph. No such utility exists in the Ceph codebase or documentation. The text also referenced "ceph-sync" which is equally nonexistent. Replaced with the actual CephFS mirroring daemon commands (`ceph fs snapshot mirror enable` and `ceph fs snapshot mirror peer_add`), which is the official mechanism for CephFS snapshot-based replication.

4. **Incomplete RGW zone promotion commands (line 114)**: The zone promotion was missing the `--default` flag on `zone modify` and was entirely missing the required `radosgw-admin zonegroup modify --rgw-zonegroup=main --master --default` command. Without promoting both the zone and zonegroup, the failover may not work correctly. Fixed by adding `--default` and the `zonegroup modify` command.

## Review Notes
- The `radosgw-admin bucket list --uid=<all-users>` placeholder on line 20 could be misleading — `<all-users>` is not a special keyword. Running `radosgw-admin bucket list` without `--uid` lists all buckets. Left as-is since it's clearly a placeholder, but could confuse readers.
- The post mentions Rook in the tags but doesn't discuss any Rook-specific configuration (CephCluster CRDs, Rook operator settings, etc.). All commands shown are native Ceph CLI commands that work with or without Rook.
- The `rbd mirror pool peer add` command uses the legacy approach. Modern Ceph versions recommend the bootstrap token method (`rbd mirror pool peer bootstrap create/import`), which is simpler and more secure. Left as-is since the legacy approach still works.
