# Validation Summary: How to Configure Hit Set Settings (Bloom Filter) for Cache Tiering in Ceph

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph (RADOS cache tiering)
- Bloom filters (hit set tracking)
- Rook (Kubernetes Ceph operator, mentioned in tags)

## Sources Consulted
- Ceph Cache Tiering documentation: https://docs.ceph.com/en/latest/rados/operations/cache-tiering/
- Ceph developer cache-pool docs: https://docs.ceph.com/en/quincy/dev/cache-pool/
- Ceph source code (`src/osd/osd_types.h`, `src/osd/osd_types.cc`, `src/osd/PrimaryLogPG.cc`, `src/osd/PeeringState.cc`, `src/osd/OSD.cc`) on GitHub
- Ceph CLI man page: https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph Pools documentation: https://docs.ceph.com/en/quincy/rados/operations/pools/

## Issues Found
- **Monitoring script incorrect JSON path**: The "Monitoring Hit Sets in Action" script accessed `d.get('hit_set_history', [])` at the top level of the `ceph pg query` output. In reality, `hit_set_history` is nested under the `info` object, and the list of hit set entries is in a `history` sub-array within that. Fixed the script to navigate `d['info']['hit_set_history']['history']` correctly.

## Review Notes
- All five pool parameters (`hit_set_type`, `hit_set_count`, `hit_set_period`, `min_read_recency_for_promote`, `min_write_recency_for_promote`) are confirmed valid Ceph OSD pool settings.
- The `ceph osd pool set` and `ceph osd pool get` command syntax is correct.
- The explanation of Bloom filter properties (false positives but no false negatives) is accurate.
- The scan resistance explanation correctly describes how `min_read_recency_for_promote` prevents sequential scan objects from being promoted.
- The `ceph pg <pgid> query` command is valid but is an OSD-level command routed via admin socket, not a monitor command. The newer equivalent is `ceph tell <pgid> query`.
- Ceph cache tiering is deprecated in newer Ceph releases (Reef+). The post does not mention this, but the technical content remains accurate for clusters that still use cache tiering.
