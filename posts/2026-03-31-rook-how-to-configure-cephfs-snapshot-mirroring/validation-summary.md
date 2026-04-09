# Validation Summary: How to Configure CephFS Snapshot Mirroring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (Pacific 16.x+)
- CephFS snapshot mirroring (`cephfs-mirror` daemon)
- Rook Ceph Operator (CephFilesystemMirror and CephFilesystem CRDs)
- cephadm orchestrator

## Sources Consulted
- Ceph official documentation on CephFS snapshot mirroring (https://docs.ceph.com/en/latest/cephfs/snap-schedule/)
- Rook documentation on CephFilesystemMirror CRD (https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-fs-mirror-crd/)
- Cross-referenced with validated blog posts in this repository: `rook-cephfilesystemmirror/README.md` and `rook-how-to-set-up-cephfs-mirroring-with-cephfilesystemmirror-crd/README.md`

## Issues Found

1. **Removed `ceph mgr module enable mirroring` from Step 1.** This command enables the RBD mirroring mgr module, not the CephFS mirror daemon. The cephfs-mirror daemon is deployed via `ceph orch apply cephfs-mirror` and does not require a separate mgr module.

2. **Reordered Steps 2-4.** The original post added a peer (Step 3) before enabling mirroring on the filesystem (Step 4). Mirroring must be enabled on the filesystem before peers can be configured. Corrected order: enable mirroring (Step 2), create bootstrap token (Step 3), import token (Step 4).

3. **Removed incorrect auth capabilities in Step 2.** The original post created a `client.mirror-peer` user with `profile rbd-mirror-peer` mon/osd caps, which are for RBD mirroring, not CephFS mirroring. The bootstrap token method (`peer_bootstrap create`) handles auth entity creation automatically, so this manual step was both incorrect and unnecessary.

4. **Added missing site-name parameter to `peer_bootstrap create`.** The original command `ceph fs snapshot mirror peer_bootstrap create myfs-secondary client.admin` was missing the required `<site-name>` parameter. Fixed to include `site-secondary`.

5. **Replaced `peer_add` with `peer_bootstrap import`.** The original Step 3 used `ceph fs snapshot mirror peer_add myfs /tmp/peer-token`, which is not the correct command for importing a bootstrap token. The correct command is `ceph fs snapshot mirror peer_bootstrap import myfs <token>`.

6. **Replaced `show-peers` with `peer list`.** The `show-peers` subcommand does not exist. The correct command to list peers is `ceph fs snapshot mirror peer list myfs`.

7. **Replaced `dirmap` with `daemon status` in Step 5.** The `dirmap` subcommand does not exist. Directory mirroring status is visible via `ceph fs snapshot mirror daemon status`.

8. **Replaced `snapshot_status` with `daemon status` in Step 6 and Monitoring.** The `snapshot_status` subcommand does not exist. Sync status is available through `ceph fs snapshot mirror daemon status`.

9. **Replaced `peer_status` with `peer list` in Monitoring.** The `peer_status` subcommand does not exist. Peer information is available via `ceph fs snapshot mirror peer list`.

10. **Fixed Rook CRD from `CephFilesystemMirrorPeer` to `CephFilesystemMirror`.** The `CephFilesystemMirrorPeer` kind does not exist in Rook. The correct CRD for deploying the cephfs-mirror daemon is `CephFilesystemMirror`. Peer configuration belongs in the `CephFilesystem` spec under `mirroring.peers.secretNames`.

11. **Removed fabricated monitoring output.** The expected output block showing `syncing_snapshots`/`synced_snapshots`/`failed_snapshots` did not correspond to any real command output format and was removed along with the non-existent commands.

## Review Notes
- The `peer_remove` command in the "Removing a Mirrored Directory" section was kept as-is since it follows the documented pattern for peer removal.
- The post correctly identifies Ceph Pacific (16.x) as the minimum version for CephFS snapshot mirroring.
- The architecture diagram and snapshot creation via `mkdir .snap/` are accurate.
