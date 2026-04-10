# Validation Summary: How to Use the ceph pg Command Suite

## Status
validated

## Post Type
Tutorial / CLI Reference Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- Placement Groups (PGs)
- kubectl CLI
- ceph CLI (`ceph pg`, `ceph osd` subcommands)

## Sources Consulted
- Ceph official docs: Placement Groups — https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph official docs: Monitoring OSDs and PGs — https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/
- Ceph official docs: Troubleshooting PGs — https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-pg/
- Ceph man page: ceph(8) — https://docs.ceph.com/en/latest/man/8/ceph/

## Issues Found

### 1. Incorrect awk column for PG state in `ceph pg dump`
- **What was wrong:** The command `ceph pg dump | awk '{print $1,$10}'` used column `$10` to extract PG state. In modern Ceph releases (Nautilus and later), the state column is not at position 10 — the column layout has shifted as fields were added over releases, making positional awk unreliable.
- **What was changed:** Replaced with `ceph pg dump pgs_brief`, which outputs a simplified format (PG ID, state, up set, acting set) purpose-built for this use case and stable across releases.
- **Why:** Positional column references in `ceph pg dump` plain-text output break across Ceph versions. `pgs_brief` is the officially supported concise output mode.

### 2. Manual `pgp_num` step presented as required
- **What was wrong:** The post showed `ceph osd pool set mypool pgp_num 256` as a required step after setting `pg_num`. Since Ceph Nautilus, `pgp_num` automatically adjusts to match `pg_num`, making this step unnecessary on all currently supported Ceph releases.
- **What was changed:** Added a comment explaining that `pgp_num` auto-adjusts since Nautilus and moved the manual `pgp_num` command to a commented-out example for pre-Nautilus clusters only.
- **Why:** The official Ceph documentation states "Admins generally do not need to touch pgp_num directly" for Nautilus and later releases.

## Review Notes
- The `force-recovery`, `cancel-force-recovery`, and `force-backfill` commands are real and documented in the Ceph operations guide but are notably absent from the `ceph(8)` man page synopsis. This is a Ceph documentation gap, not an error in the blog post.
- All other commands (`ceph pg stat`, `ceph pg dump`, `ceph pg dump_stuck`, `ceph pg query`, `ceph osd map`, `ceph pg repair`, `ceph pg deep-scrub`, `ceph pg scrub`, `ceph osd pool autoscale-status`) were verified as correct in syntax and behavior.
- The conceptual explanation that "Each pool is divided into PGs, and each PG is mapped to a set of OSDs" is accurate per official documentation.
- The `pg_autoscale_mode on` value is correct (valid values are `off`, `on`, `warn`).
