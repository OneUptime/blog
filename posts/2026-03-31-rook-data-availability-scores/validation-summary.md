# Validation Summary: How to Calculate Data Availability Scores in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Ceph Placement Groups (PGs)
- kubectl (Kubernetes CLI)
- Python 3 (for JSON parsing scripts)
- Bash scripting

## Sources Consulted
- [Ceph PGMap.cc source code (ceph/ceph GitHub)](https://github.com/ceph/ceph/blob/main/src/mon/PGMap.cc) — verified JSON field names for `num_pg_by_state` entries: `PGMapDigest::dump()` uses `"state"` and `"num"` fields, `print_oneline_summary()` uses `"name"` and `"num"` fields.
- [Ceph Bug #21609 — valid PG states for `ceph pg ls`](https://tracker.ceph.com/issues/21609) — confirmed valid PG state filters; `unfound` is not a valid PG state.
- [Ceph Monitoring OSDs and PGs documentation](https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/) — reference for PG monitoring commands.
- [Ceph Troubleshooting PGs documentation](https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-pg/) — reference for unfound objects handling.
- [collectd-ceph issue #3 (GitHub)](https://github.com/rochaporto/collectd-ceph/issues/3) — verified `pg_stats_sum.stat_sum` JSON structure contains `num_objects_degraded`, `num_objects_unfound`, etc.
- [Red Hat Ceph Storage PG Command Line Reference](https://docs.redhat.com/en/documentation/red_hat_ceph_storage/1.2.3/html/storage_strategies/pg-command-line-reference) — verified PG command syntax.

## Issues Found

### Issue 1: Wrong field name in `num_pg_by_state` JSON access
- **What was wrong:** In the "Measure PG Health Distribution" script, the code accessed `state_info['count']` to get the PG count for each state. The Ceph JSON output uses `"num"` as the field name, not `"count"`. This was confirmed by inspecting the `PGMapDigest::dump()` function in `PGMap.cc` which calls `f->dump_unsigned("num", p.second)`.
- **What was changed:** Replaced all three occurrences of `state_info['count']` with `state_info['num']` (in the sort key, percentage calculation, and print statement).
- **Why:** The script would raise a `KeyError` at runtime because the `"count"` key does not exist in the JSON output. The correct field name is `"num"`.

### Issue 2: Invalid `ceph pg ls unfound` command
- **What was wrong:** The command `ceph pg ls unfound` was used to "list PGs with unfound objects," but `unfound` is not a valid PG state filter for `ceph pg ls`. Valid states are: stale, creating, active, activating, clean, recovery_wait, recovery_toofull, recovering, forced_recovery, down, undersized, degraded, remapped, scrubbing, deep, inconsistent, peering, repair, backfilling, forced_backfill, backfill_toofull, incomplete, peered, snaptrim, snaptrim_wait, snaptrim_error.
- **What was changed:** Replaced `ceph pg ls unfound` with `ceph pg dump_stuck unclean`, which lists PGs stuck in a non-clean state (this includes PGs affected by unfound objects, since they cannot complete recovery).
- **Why:** The original command would produce an error ("not a valid PG state"). The replacement command is valid and serves the intent of identifying problematic PGs that may have unfound objects.

## Review Notes
- The `ceph pg stat --format json` command's JSON structure depends on which internal code path is used. The `pg_stats_sum.stat_sum` access path used in the "Calculate Availability Percentage" and "Track Availability Over Time" scripts is correct for the `dump()` code path, which Ceph typically uses for JSON-formatted output.
- The `num_pg_by_state` field `"state"` (used in the blog) is correct for the `dump()` path. Note that the `print_oneline_summary()` path uses `"name"` instead — but this path is used for plain text output, not JSON.
- The availability formula `(total - degraded - unfound) / total * 100` is conceptually sound. Degraded objects are under-replicated but readable; unfound objects represent potential data loss. The formula correctly treats both as reducing availability.
- The monitoring script in "Track Availability Over Time" defaults `num_objects` to 1 (not 0) to avoid division by zero, which is a reasonable approach for a monitoring loop.
