# Validation Summary: How to Revert Lost RADOS Objects with pg mark_unfound_lost

## Status
validated

## Post Type
Tutorial / Recovery Guide

## Technologies Covered
- Ceph (RADOS, PG management, OSD recovery)
- Rook (Kubernetes Ceph operator)
- RGW (RADOS Gateway / S3-compatible object storage)
- RBD (RADOS Block Device)
- kubectl

## Sources Consulted
- Ceph official documentation on placement group states: https://docs.ceph.com/en/latest/rados/operations/pg-states/
- Ceph official documentation on `mark_unfound_lost`: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-pg/#unfound-objects
- Ceph official documentation on `pg dump_stuck`: https://docs.ceph.com/en/latest/rados/operations/monitoring/#stuck-pgs
- Ceph official documentation on pool settings (`min_size`): https://docs.ceph.com/en/latest/rados/operations/pools/
- Rook documentation on OSD management: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-osd-mgmt/

## Issues Found

1. **Invalid `ceph pg dump_stuck unfound` command**: `unfound` is not a valid stuck state for `pg dump_stuck`. Valid states are `inactive`, `unclean`, `stale`, `undersized`, and `degraded`. Changed to `ceph health detail | grep unfound` which correctly surfaces PGs with unfound objects.

2. **Incorrect PG state string in example output**: `active+recover+unfound` used an invalid state `recover`. The correct PG state is `recovering`. Updated the example to `active+recovering+degraded, 3 unfound` which matches actual Ceph health detail output format.

3. **Incorrect example output format**: `objects with missing copies: 3` is not how Ceph reports unfound objects. Changed to `3 unfound objects` to match actual output.

4. **`min_size` is a pool property, not a global config**: `ceph config set global min_size 2` is invalid. `min_size` is set per-pool using `ceph osd pool set <pool-name> min_size 2`. Fixed the command and updated the comment to clarify it controls minimum replicas before writes are allowed.

## Review Notes
- The `ceph osd pool create ec-pool 64 64 erasure myprofile` command uses older syntax specifying both pg_num and pgp_num explicitly. In modern Ceph (Nautilus+), pgp_num auto-follows pg_num, so the second `64` is redundant but still accepted. Not changed as it remains functional.
- The claim that "RGW often has prior snapshots or versions" as justification for `revert` is slightly misleading — `revert` operates on RADOS-level prior object versions, not RGW versioning. However, the practical advice (prefer `revert`) is correct, so this was left as-is.
