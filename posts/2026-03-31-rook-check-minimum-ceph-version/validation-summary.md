# Validation Summary: How to Check Minimum Ceph Version for Rook Upgrades

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage system)
- Kubernetes (kubectl CLI)
- Python 3 (version comparison scripting)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Ceph upgrade documentation: https://rook.io/docs/rook/latest/Upgrade/ceph-upgrade/
- Rook v1.14 CephCluster CRD documentation: https://rook.io/docs/rook/v1.14/CRDs/Cluster/ceph-cluster-crd/
- Ceph CLI manpage: https://manpages.ubuntu.com/manpages/questing/man8/ceph.8.html
- Ceph source code (MonCommands.h) for `ceph features` and `ceph versions` commands
- Ceph GitHub PR #16460 (added `ceph versions` command)

## Issues Found
1. **Incorrect Ceph version compatibility for Rook v1.14.x**: The post listed Ceph Pacific (v16.x) as "deprecated" under Rook v1.14.x. Pacific support was actually removed in Rook v1.13, so it was not available at all in v1.14.x. Removed the Pacific entry from the example compatibility table.

2. **Wrong URL for compatibility matrix**: The post referenced `https://rook.io/docs/rook/latest/Getting-Started/Prerequisites/prerequisites/` as the location of the Ceph version compatibility matrix. That page covers Kubernetes version requirements and hardware prerequisites, not Ceph version compatibility. Changed the reference to point to the Rook upgrade documentation (`https://rook.io/docs/rook/latest/Upgrade/ceph-upgrade/`) and the CephCluster CRD documentation, which are the actual sources for Ceph version support information.

3. **Misleading comment about `ceph features`**: The comment "Check if CSI features are supported" was misleading. The `ceph features` command reports connected daemon and client feature bitmasks, not CSI-specific capabilities. Updated the comment to accurately describe what the command does.

## Review Notes
- The `ceph versions` output example omits the `overall` and `rgw` keys that are typically present in real output. This is acceptable since it is illustrative and the cluster shown may not have RGW deployed, but readers should be aware the real output may include additional keys.
- The version comparison script correctly uses Python tuple comparison for semantic versioning, and the `ceph version --format json` parsing logic is sound.
- The Ceph one-major-version-at-a-time upgrade constraint is presented as a strict rule. In practice, the enforcement is slightly more nuanced (some two-version jumps were historically possible), but following the sequential upgrade path is the officially recommended approach, so the post's guidance is correct as a practical matter.
