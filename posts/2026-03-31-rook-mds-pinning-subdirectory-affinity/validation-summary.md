# Validation Summary: How to Set Up MDS Pinning for Subdirectory Affinity

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph MDS (Metadata Server)
- CephFS (Ceph Filesystem)
- MDS export pinning (`ceph.dir.pin` extended attributes)
- Ephemeral distributed pinning (`ceph.dir.pin.distributed`)
- Kubernetes (kubectl, toolbox pod)

## Sources Consulted
- Ceph official documentation: Configuring multiple active MDS daemons (https://docs.ceph.com/en/latest/cephfs/multimds/)
- Ceph source: multimds.rst on GitHub (https://github.com/ceph/ceph/blob/main/doc/cephfs/multimds.rst)
- Ceph blog: New in Luminous: CephFS subtree pinning (https://ceph.io/en/news/blog/2017/new-luminous-cephfs-subtree-pinning/)
- Ceph blog: New in Luminous: Multiple Active Metadata Servers in CephFS (https://ceph.io/en/news/blog/2017/new-luminous-multiple-active-metadata-servers-cephfs/)
- Ceph Mimic (v13.2.0) release notes for `allow_dirfrags` deprecation (https://docs.ceph.com/en/nautilus/releases/mimic/)
- Ceph directory fragmentation documentation (https://docs.ceph.com/en/quincy/cephfs/dirfrags/)
- Ceph MDS admin socket commands: MDSDaemon.cc source (https://github.com/ceph/ceph/blob/main/src/mds/MDSDaemon.cc)
- Rook CephFilesystem CRD documentation (https://rook.io/docs/rook/latest-release/CRDs/Shared-Filesystem/ceph-filesystem-crd/)

## Issues Found
1. **Incorrect prerequisite: `ceph fs set myfs allow_dirfrags true`** — The post included this command before the pinning commands, implying it was a prerequisite for MDS export pinning. This is incorrect: `allow_dirfrags` controls directory fragmentation (splitting large directories into multiple fragments), which is an entirely separate feature from export pinning (`ceph.dir.pin`). Furthermore, `allow_dirfrags` was deprecated in Ceph Mimic (v13.2.0) as directory fragmentation became enabled by default. The official multimds.rst documentation makes no mention of `allow_dirfrags` in the pinning section. **Fix:** Removed the `ceph fs set myfs allow_dirfrags true` command from the "Pinning a Directory to a Specific MDS Rank" section.

## Review Notes
- All other technical claims were verified as correct: the `ceph.dir.pin` attribute name and `setfattr` syntax, pin removal with value `-1`, pin inheritance behavior, ephemeral distributed pinning via `ceph.dir.pin.distributed`, MDS admin socket commands (`get subtrees` with `auth_first` field, `dirfrag ls`), and the Rook CRD field names (`metadataServer.activeCount`, `metadataServer.activeStandby`).
- The `ceph daemon` commands used in the monitoring section require access to the MDS admin socket, which works from the toolbox pod as shown but may require adjusting the daemon name to match the actual MDS instance name in a given cluster.
