# Validation Summary: How to Understand the active PG State in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (placement groups, OSD peering, PG states)
- Rook (Ceph operator for Kubernetes)
- CLI tools: `ceph pg stat`, `ceph pg dump`, `ceph pg query`, `jq`, `awk`

## Sources Consulted
- Ceph official documentation on Placement Group states: https://docs.ceph.com/en/latest/rados/operations/pg-states/
- Ceph official documentation on monitoring PGs: https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/
- Ceph source code for `ceph pg stat` JSON output field names
- Ceph documentation on `mark_unfound_lost` vs PG peering troubleshooting: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-pg/

## Issues Found

### Issue 1: Incorrect JSON field name in `ceph pg stat` output
- **What was wrong:** The command `ceph pg stat --format json | jq '.num_pgs_by_state'` used an incorrect field name `num_pgs_by_state`.
- **What was changed:** Corrected to `num_pg_by_state` (singular `pg`, no `s`).
- **Why:** The actual JSON output from `ceph pg stat` uses `num_pg_by_state` as the field name.

### Issue 2: Wrong command for forcing a stuck-peering PG to become active
- **What was wrong:** The section "Forcing a PG to Become Active" suggested using `ceph pg <pg-id> mark_unfound_lost revert` to resolve a PG stuck in peering. The `mark_unfound_lost` command is for handling unfound objects in an already-active PG (typically in `active+recovery_unfound` state), not for resolving peering issues.
- **What was changed:** Replaced with correct troubleshooting steps: checking `peering_state` to diagnose the block, checking the acting set, and using `ceph pg force_create_pg` as a last resort (with a data loss warning).
- **Why:** Using `mark_unfound_lost` on a PG stuck in peering would either fail or not address the actual problem. The correct approach is to identify which peer OSDs are blocking peering and, if they cannot be recovered, use `force_create_pg`.

## Review Notes
- The `ceph pg dump | awk '{print $1, $16}'` command uses a hardcoded column number ($16) for the state field. This column position may vary across Ceph versions. A more robust alternative would be `ceph pg dump pgs_brief` or using JSON output with `jq`. This is not an error per se but is fragile.
- The peering process description is a reasonable simplification for a blog post, though the term "prior set" is informal. The actual mechanism involves exchanging `pg_info` and `pg_log` structures.
