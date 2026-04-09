# Validation Summary: How to Force Recovery and Force Backfill for PGs in Ceph

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Ceph (distributed storage system)
- Ceph Placement Groups (PGs)
- Ceph CLI (`ceph pg` subcommands)
- Rook (Ceph operator for Kubernetes, mentioned in tags)
- Bash scripting

## Sources Consulted
- Ceph official documentation — Placement Groups operations: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph official documentation — Reef release PG operations: https://docs.ceph.com/en/reef/rados/operations/placement-groups/
- Ceph CLI man page (`ceph(8)`): https://docs.ceph.com/en/latest/man/8/ceph/
- Red Hat Ceph Storage documentation for command cross-reference

## Issues Found

### Issue 1: Non-existent command `ceph osd recovery-stats`
- **What was wrong:** The post referenced `ceph osd recovery-stats` as a way to show recovery queue details. This command does not exist in any version of Ceph.
- **What was changed:** Replaced with `ceph pg stat`, which is a valid command that displays PG statistics including recovery counts and progress.
- **Why:** The original command would fail with an unrecognized command error, breaking the reader's workflow.

### Issue 2: Incorrect `awk` column number for PG state in `ceph pg dump pgs`
- **What was wrong:** The post used `awk '{print $1, $15}'` and `awk '$15 ~ /degraded/ {print $1}'` to extract PG state from `ceph pg dump pgs` output. Column 15 (`$15`) does not correspond to the state field; the column layout varies across Ceph versions.
- **What was changed:** Replaced `ceph pg dump pgs` with `ceph pg dump pgs_brief` and changed the column reference to `$2`. The `pgs_brief` subcommand outputs a compact format where the state is reliably in column 2 (columns: PG_STAT, STATE, UP, UP_PRIMARY, ACTING, ACTING_PRIMARY).
- **Why:** Using the wrong column number would result in incorrect output — either empty results or matching the wrong field. The `pgs_brief` format is more stable across versions and better suited for text parsing.

## Review Notes
- All core commands (`ceph pg force-recovery`, `ceph pg force-backfill`, `ceph pg cancel-force-recovery`, `ceph pg cancel-force-backfill`) are verified correct and accept multiple PG IDs as documented.
- The `ceph pg <pgid> query` syntax used in the post is valid and returns JSON output as described.
- The `ceph health detail | grep "pg"` approach is functional, though a more precise pattern like `grep "^pg "` would avoid potential false matches.
- The bulk scripting example is sound in approach. Operators should be cautious about force-recovering a very large number of PGs simultaneously, as it can overwhelm OSD recovery bandwidth.
