# Validation Summary: How to Use the Placement Group Calculator

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (Placement Groups, CRUSH algorithm, PG autoscaler)
- Rook (CephBlockPool CRD)
- Kubernetes (kubectl exec into Rook toolbox)

## Sources Consulted
- Ceph official documentation on Placement Groups: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph PG autoscaler module documentation: https://docs.ceph.com/en/latest/rados/operations/placement-groups/#autoscaling-placement-groups
- Ceph CLI reference for `osd pool` commands: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph CLI reference for `pg dump` commands: https://docs.ceph.com/en/latest/man/8/ceph/#pg
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph Nautilus release notes (pg_num power-of-2 requirement removed)

## Issues Found

1. **"PG count must be a power of 2" (line 21)** — Since Ceph Nautilus (14.x, released 2019), `pg_num` is no longer required to be a power of 2. The post stated "must be" which is incorrect for any modern Ceph version. Changed to "is recommended to be a power of 2 (no longer required since Ceph Nautilus)."

2. **Invalid CLI command: `ceph osd pool get replicapool pg_autoscale_status` (line 72)** — `pg_autoscale_status` is not a valid gettable pool property. This command would fail with an error. The valid property is `pg_autoscale_mode` (which returns whether autoscaling is `on`, `off`, or `warn` for that pool). Changed the command to `ceph osd pool get replicapool pg_autoscale_mode` and updated the description to match.

3. **Invalid CLI command: `ceph pg dump_pools` (line 141)** — The underscore syntax is incorrect. The Ceph CLI expects `ceph pg dump pools` (with a space). Changed `dump_pools` to `dump pools`.

## Review Notes
- The manual PG calculation formula omits the number of pools as a divisor. The formula works correctly for a single-pool scenario, but when multiple pools exist, the total PG count should be divided across pools. The post does mention pool count in the "Online PG Calculator" section, so this is not strictly wrong but could be clarified in a future revision.
- The `pgp_num` setting shown alongside `pg_num` is technically unnecessary in modern Ceph (Nautilus+), as changing `pg_num` automatically adjusts `pgp_num`. However, setting it explicitly is harmless and provides backwards compatibility, so this was left as-is.
- The online PG calculator URL (`https://old.ceph.com/pgcalc/`) points to the legacy Ceph calculator. This URL may become unavailable in the future; the Ceph docs now recommend using the built-in autoscaler instead.
