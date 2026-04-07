# Validation Summary: How to Understand PG Splitting in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (Placement Groups, CRUSH, OSD management)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl commands for Rook toolbox)

## Sources Consulted
- Ceph documentation on Placement Groups: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph documentation on PG concepts: https://docs.ceph.com/en/latest/rados/operations/pg-concepts/
- Ceph documentation on pool operations (pg_num, pgp_num): https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph Nautilus release notes (pgp_num auto-adjustment): https://docs.ceph.com/en/latest/releases/nautilus/

## Issues Found
- **PG ID hex notation error (line 21)**: The post stated "64.0 splits into 64.0 and 64.64". Ceph displays PG IDs in hexadecimal format (`<pool_id>.<pg_id_hex>`). When pg_num doubles from 64 to 128, PG 0 splits and the new child PG gets pg_id 64 decimal, which is 0x40 in hex. Fixed the example to use pool ID 1 for clarity: "1.0 splits into 1.0 and 1.40, since PG ID 64 = 0x40 in hex".

## Review Notes
- **pgp_num auto-adjustment in modern Ceph**: Since Ceph Nautilus (14.2+), `pgp_num` automatically follows `pg_num` when it is increased. The post advises manually setting `pgp_num` after `pg_num`, which was necessary in pre-Nautilus releases but is now handled automatically. Since Rook deploys modern Ceph versions (Nautilus and later), the manual `pgp_num` step is unnecessary in practice. The commands are not wrong (they still work), but readers may be confused about why `pgp_num` doesn't need separate management on their clusters. A future update could note this behavior change.
- **Powers-of-two recommendation**: Since Nautilus, pg_num no longer needs to be a power of two. The post's advice to split "in powers of two" is safe and produces optimal distribution, but is no longer strictly required. A future update could mention this relaxation.
- All CLI commands (`ceph osd pool set`, `ceph osd pool get`, `ceph pg stat`, `ceph osd pool autoscale-status`, `ceph config set osd osd_max_backfills`) are syntactically correct and use valid options.
