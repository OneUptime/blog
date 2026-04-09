# Validation Summary: How to Gracefully Take Down a CephFS Cluster (down Flag, Journal Flushing)

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Ceph (CephFS, MDS, RADOS)
- Rook (Rook-Ceph operator for Kubernetes)
- Kubernetes (kubectl)

## Sources Consulted
- Ceph CephFS Client Eviction Documentation — https://docs.ceph.com/en/latest/cephfs/eviction/
- Ceph CephFS Administration Documentation — https://docs.ceph.com/en/latest/cephfs/administration/
- Ceph MDS Journaling Documentation — https://docs.ceph.com/en/latest/cephfs/mds-journaling/
- Ceph Disaster Recovery Documentation — https://docs.ceph.com/en/latest/cephfs/disaster-recovery/
- Ceph source: FSCommands.cc (down/joinable implementation) — https://github.com/ceph/ceph/blob/main/src/mon/FSCommands.cc
- Ceph source: MDSDaemon.cc (flush journal command registration) — https://github.com/ceph/ceph/blob/main/src/mds/MDSDaemon.cc
- Ceph source: SessionMap.cc (SessionFilter id=* parsing) — https://github.com/ceph/ceph/blob/main/src/mds/SessionMap.cc

## Issues Found
1. **Incorrect client eviction command syntax (Step 2)**: The command `ceph tell mds.* client evict --id all` used incorrect CLI-style flag syntax (`--id`) and an invalid wildcard value (`all`). The `ceph tell mds` client evict subcommand uses `key=value` filter syntax, not `--key value` flags. The correct wildcard for evicting all clients is `*`, not `all`. Fixed to: `ceph tell mds.* client evict id=*`.

## Review Notes
- The manual journal flush in Step 3 is technically redundant when using `ceph fs set cephfs down true`, because the `down` flag triggers an orderly MDS shutdown that includes journal flushing. However, pre-flushing is a valid belt-and-suspenders practice and is not harmful, so it was left as-is.
- The journal flush command (`ceph tell mds.cephfs:0 flush journal`) targets only rank 0. If `max_mds > 1` (multiple active MDS ranks), each rank's journal would need to be flushed separately. The post implicitly assumes a single active MDS, which is the common default configuration.
- The `down` flag (`ceph fs set cephfs down true`) is not deprecated. It remains fully supported in current Ceph releases. It differs from `ceph fs fail`, which performs an emergency (non-graceful) shutdown without journal flushing.
- The `ceph fs set cephfs down false` command is the correct way to reverse a `down true` shutdown. This is distinct from `ceph fs set cephfs joinable true`, which is the reverse for `ceph fs fail`.
