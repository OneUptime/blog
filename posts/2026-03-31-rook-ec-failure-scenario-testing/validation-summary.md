# Validation Summary: How to Test Erasure Coding Failure Scenarios in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (erasure coding, OSD management, RADOS, deep scrub)
- Rook (Kubernetes Ceph operator)
- Kubernetes (pod management, node cordoning)
- Jerasure plugin (reed_sol_van technique)

## Sources Consulted
- Ceph Jerasure erasure code plugin documentation: https://docs.ceph.com/en/latest/rados/operations/erasure-code-jerasure/
- Ceph Pools documentation: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph Monitoring OSDs and PGs: https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/
- Ceph Adding/Removing OSDs: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/
- Ceph rados.cc source code (for `rados get -` stdout behavior): https://github.com/ceph/ceph/blob/main/src/tools/rados/rados.cc

## Issues Found

### 1. Scenario 3 missing `ceph osd down` commands
- **What was wrong:** Scenario 3 (Triple OSD Failure) only used `ceph osd out` for all three OSDs but omitted the corresponding `ceph osd down` commands. Scenarios 1 and 2 correctly used both `out` and `down`. When an OSD is marked `out` but not `down`, the OSD process is still running and continues serving data during the rebalancing transition. This means PGs would not actually enter the `incomplete` state as the post claimed.
- **What was changed:** Added `ceph osd down osd.2`, `ceph osd down osd.3`, and `ceph osd down osd.4` commands after the `out` commands to properly simulate OSD failure.
- **Why:** For realistic failure simulation, both `out` (removes from CRUSH map) and `down` (marks as unreachable, triggers immediate re-peering) are needed. Without `down`, the running OSD daemon still participates in serving I/O during the transition period.

### 2. Deep scrub `awk` command captures header row
- **What was wrong:** The command `ceph pg ls-by-pool test-ec-pool | awk '{print $1}'` would also capture the header line output by `ceph pg ls-by-pool`, which starts with "PG". This would cause `ceph pg deep-scrub PG` to error.
- **What was changed:** Changed `awk '{print $1}'` to `awk '/^[0-9]/{print $1}'` to only match lines starting with a digit (actual PG IDs like `3.1a`), skipping the header row and any trailing summary lines.
- **Why:** The `ceph pg ls-by-pool` command outputs a header row with column names. Only lines starting with a digit are actual PG entries.

## Review Notes
- The `ceph osd pool set test-ec-pool nodeep-scrub 0` syntax was verified as correct for pool-level flags. There is no `ceph osd pool unset` subcommand; the `unset` variant only exists at the cluster level (`ceph osd unset`).
- The `rados get <objname> -` command was verified in the Ceph source code to correctly output to stdout (not create a file named "-").
- The erasure coding math is correct throughout: k=4, m=2 means 6 total shards, tolerates up to 2 failures, and needs minimum k=4 shards for reconstruction.
- The Rook-specific section correctly demonstrates OSD failure simulation via pod deletion and node cordoning.
