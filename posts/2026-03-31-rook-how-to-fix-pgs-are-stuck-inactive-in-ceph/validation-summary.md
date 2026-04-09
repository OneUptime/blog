# Validation Summary: How to Fix 'pgs are stuck inactive' in Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (placement groups, OSDs, CRUSH map, peering)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl, pod management)

## Sources Consulted
- Ceph official documentation on Placement Groups: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph official documentation on `pg repeer` command: https://docs.ceph.com/en/latest/man/8/ceph/#pg
- Ceph official documentation on Troubleshooting PGs: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-pg/
- Ceph official documentation on CRUSH map: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Rook documentation on the Ceph toolbox: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found

1. **Invalid command `ceph osd force-create-pg` in Step 4**: The command `ceph osd force-create-pg <pgid>` does not exist in Ceph. The correct command to force a placement group to re-peer is `ceph pg repeer <pgid>`. The accompanying description was also misleading — it stated the command "forces PG creation and may result in data loss," which is incorrect for a repeer operation. Replaced with `ceph pg repeer <pgid>` and updated the description to accurately explain that repeering resets the peering process without destroying data.

2. **Example `ceph status` output in Step 1 did not show inactive PGs**: The example output showed `stale+active+undersized` and `activating` states but no `inactive` PGs, which is the specific condition the post is about. Replaced with an example showing `inactive+peering` and `stale+inactive` states so readers can recognize the actual problem in their own output.

3. **`-it` flags in `watch` command in Step 8**: The command `watch -n5 "kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status"` uses `-it` (interactive + TTY) flags inside a `watch` wrapper. Since `watch` does not provide an interactive terminal, the `-t` flag can cause TTY allocation warnings or failures. Removed `-it` so the command runs cleanly inside `watch`.

## Review Notes
- All other Ceph commands (`ceph osd tree`, `ceph pg dump_stuck inactive`, `ceph osd pool set`, `ceph osd crush remove`, `ceph pg query`) are syntactically correct and appropriate for the described scenarios.
- The `ceph osd pool ls detail` command in Step 3 is correct and will show size/min_size information for pools.
- The advice about temporarily lowering `min_size` is appropriately marked as an emergency-only measure with clear warnings about data redundancy risks.
- The Rook/Kubernetes integration commands (toolbox exec pattern, pod deletion for restart, label selectors) are all correct for standard Rook-Ceph deployments.
