# Validation Summary: How to Fix TOO_FEW_PGS Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- Ceph Placement Groups (PGs)
- Ceph PG Autoscaler module
- Ceph OSD management

## Sources Consulted
- Ceph official documentation on Placement Groups: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph official documentation on PG Autoscaler: https://docs.ceph.com/en/latest/rados/operations/placement-groups/#autoscaling-placement-groups
- Ceph official documentation on pool operations: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph health checks reference: https://docs.ceph.com/en/latest/rados/operations/health-checks/#too-few-pgs

## Issues Found
No technical issues found.

## Review Notes
- **pgp_num auto-adjustment in modern Ceph**: Since Ceph Nautilus (14.2.0+), `pgp_num` is automatically adjusted to match `pg_num` when `pg_num` is changed. The post's Option 2 instructs users to set `pgp_num` separately after `pg_num`, which was required in pre-Nautilus releases. This is not wrong (setting it explicitly still works and is a no-op if already matched), but a future update could note that this step is unnecessary on Nautilus and later clusters.
- **Pool creation syntax**: The positional `pg_num pgp_num` syntax in `ceph osd pool create my-pool 16 16 replicated` is older-style. Modern Ceph documentation prefers named flags (e.g., `--pg-num`), but the positional syntax remains supported and functional.
- All commands, flags, formulas, and technical explanations are accurate for current Ceph releases.
