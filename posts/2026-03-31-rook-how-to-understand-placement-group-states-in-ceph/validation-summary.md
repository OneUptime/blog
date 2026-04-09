# Validation Summary: How to Understand Placement Group States in Ceph

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Ceph (distributed storage system)
- Ceph Placement Groups (PGs)
- Ceph CLI (`ceph pg stat`, `ceph pg dump`, `ceph pg dump_stuck`, `ceph pg query`, `ceph pg repair`, `ceph pg force-recovery`)
- jq (JSON processing)
- Rook (mentioned in tags, not directly used in post)

## Sources Consulted
- Ceph official documentation on Placement Groups: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph official documentation on monitoring PGs: https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/
- Ceph CLI reference for `ceph pg dump_stuck`: https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph documentation on PG states: https://docs.ceph.com/en/latest/rados/operations/pg-states/
- Ceph JSON output format for `ceph pg dump` (Nautilus+ schema)

## Issues Found

### 1. Incorrect jq path for `ceph pg dump` JSON output
- **What was wrong:** The jq filter used `.pg_map.pg_stats[]` to parse the output of `ceph pg dump --format json-pretty`. Since Ceph Nautilus (14.x) and later, `pg_stats` is a top-level key in the JSON output, not nested under `pg_map`.
- **What was changed:** Updated the jq path from `.pg_map.pg_stats[]` to `.pg_stats[]`.
- **Why:** The original command would produce a `null` result on any modern Ceph cluster (Nautilus, Octopus, Pacific, Quincy, Reef).

### 2. Invalid `ceph pg dump_stuck backfilling` command
- **What was wrong:** The command `ceph pg dump_stuck backfilling` was shown under the "backfilling" section. However, `backfilling` is not a valid type for `dump_stuck`. The accepted types are: `inactive`, `unclean`, `stale`, `undersized`, and `degraded`.
- **What was changed:** Replaced with `ceph pg dump pgs_brief | grep backfill`, which correctly identifies PGs in a backfilling state.
- **Why:** The original command would produce an error when executed.

### 3. `ceph pg repair` misrepresented as forcing recovery
- **What was wrong:** The post presented `ceph pg repair <pgid>` under "Forcing Recovery" with the description "To force a PG to recover." In reality, `ceph pg repair` initiates a repair scrub to fix inconsistencies found during scrubbing — it is not a general recovery mechanism for stuck PGs.
- **What was changed:** Added `ceph pg force-recovery <pgid>` as the correct command for prioritizing PG recovery, and kept `ceph pg repair` with an accurate description of its purpose (repairing inconsistencies).
- **Why:** Using the wrong command would not achieve the intended result and could confuse readers troubleshooting stuck PGs.

## Review Notes
- The description of "backfilling" as "similar to recovering but for new OSDs" is a simplification. Technically, backfill occurs when PG logs are insufficient to identify deltas and a full scan is needed — this can happen for reasons beyond adding a new OSD. The simplification is acceptable for an introductory guide.
- The `repair` PG state description is technically correct but could note that it always appears in combination with scrubbing states (e.g., `active+clean+scrubbing+deep+repair`), never as a standalone state.
- The post could benefit from mentioning `ceph pg force-backfill <pgid>` alongside `force-recovery`, but this is an enhancement rather than a correction.
