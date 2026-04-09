# Validation Summary: How to Fix POOL_TOO_MANY_PGS Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Ceph PG Autoscaler module
- Ceph Placement Groups (PGs)
- Ceph OSD management

## Sources Consulted
- Ceph official health checks documentation (docs.ceph.com/en/latest/rados/operations/health-checks/)
- Ceph Placement Groups documentation (docs.ceph.com/en/latest/rados/operations/placement-groups/)
- Ceph PG Autoscaler module documentation (docs.ceph.com/en/latest/rados/operations/placement-groups/#autoscaling-placement-groups)
- Ceph pool operations documentation (docs.ceph.com/en/latest/rados/operations/pools/)

## Issues Found
No technical issues requiring correction were found. The commands, explanations, and recommended approaches are accurate. See Review Notes for minor observations.

## Review Notes
- **Option 2 - pgp_num step is redundant on Nautilus+**: The post instructs users to manually set `pgp_num` after reducing `pg_num`. Since Ceph Nautilus (which the post itself references as the version that introduced PG merging), `pgp_num` automatically tracks `pg_num`. This step is a harmless no-op on modern Ceph but could confuse users into thinking it is required. Future improvement: add a note that this step is only needed for pre-Nautilus clusters.
- **Option 3 - `pg_num_target` parameter**: This parameter is not prominently documented in official Ceph pool operations docs. It may be an internal value used by the PG autoscaler rather than a user-settable pool property. Users should verify this works in their Ceph version before relying on it. The autoscaler (Option 1) or direct `pg_num` reduction (Option 2) are more reliably documented approaches.
- **Pool creation syntax**: The `--autoscale-mode on` flag (space-separated) is used rather than `--autoscale-mode=on` (equals-separated). Both forms are generally accepted by the Ceph CLI argument parser, so this is not an error.
- **Example health output format**: The example `ceph health detail` output is illustrative. Actual Ceph output phrasing may differ slightly between versions (e.g., "pool 'X' has N placement groups, should have Y" vs. the format shown). This is acceptable for a tutorial.
- The overall guidance — prefer the PG autoscaler, avoid manual PG management, don't reduce PGs during recovery/backfill — aligns with Ceph best practices.
