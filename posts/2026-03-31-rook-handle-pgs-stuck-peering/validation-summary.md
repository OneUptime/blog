# Validation Summary: How to Handle PGs Stuck in Peering State in Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Placement Groups (PGs) and OSD management
- systemd / journalctl
- kubectl (Kubernetes CLI)
- chrony (NTP synchronization)

## Sources Consulted
- [Ceph man page - ceph.8](https://manpages.debian.org/testing/ceph-common/ceph.8.en.html) — verified `ceph pg dump_stuck` valid type arguments
- [Ceph Troubleshooting PGs Documentation](https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-pg/) — verified PG state terminology and troubleshooting commands
- [Ceph Monitoring OSDs and PGs](https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/) — verified `ceph osd df` output format and column positions
- [Ceph Control Commands Documentation](https://docs.ceph.com/en/latest/rados/operations/control/) — verified `ceph osd set noout`, `ceph osd purge`, and force-recovery commands
- [Red Hat Ceph Storage - PG Command Line Reference](https://access.redhat.com/documentation/en-us/red_hat_ceph_storage/1.2.3/html/storage_strategies/pg-command-line-reference)
- [Red Hat - What does OMAP and META in ceph osd df output mean](https://access.redhat.com/solutions/4594591) — confirmed modern `ceph osd df` column layout
- [Ceph Reef Release Notes](https://ceph.io/en/news/blog/2023/v18-2-0-reef-released/) — confirmed column changes in modern Ceph

## Issues Found

### Issue 1: Invalid argument for `ceph pg dump_stuck`
- **What was wrong:** The command `ceph pg dump_stuck peering` used "peering" as the type argument, but `dump_stuck` only accepts: `inactive`, `unclean`, `stale`, `undersized`, `degraded`. Running this command would produce an error.
- **What was changed:** Replaced `ceph pg dump_stuck peering` with `ceph pg dump_stuck inactive`, since PGs stuck in peering are inactive (not serving I/O) and will appear in the inactive stuck list.
- **Why:** The `dump_stuck` subcommand has a fixed set of valid type arguments defined in the Ceph CLI. "peering" is a PG state but not a valid `dump_stuck` type.

### Issue 2: Wrong column number in `ceph osd df` awk command
- **What was wrong:** The command `ceph osd df | awk '$8 > 85 {...}'` referenced column `$8` for `%USE`. In modern Ceph versions (Pacific 16.x+, Quincy 17.x+, Reef 18.x+, Squid 19.x+), column `$8` is the `OMAP` column, not `%USE`. The `%USE` column is at position `$11` due to the addition of DATA, OMAP, and META columns in the BlueStore era.
- **What was changed:** Updated `$8` to `$11` in the awk command to correctly reference the `%USE` column in modern Ceph.
- **Why:** Using `$8` would silently fail to detect full OSDs because it would be comparing the OMAP value (typically 0B or very small) against the threshold, making the monitoring command ineffective.

## Review Notes
- The `ceph osd df` column positions were correct for older Ceph versions (Nautilus/Mimic era where %USE was column 8), but since this is a 2026 blog post, modern Ceph versions should be assumed.
- The sample JSON output for `ceph pg query` is illustrative and contains plausible field names (`state`, `acting`, `up`, `peering_blocked_by`). These are real fields in PG query output.
- All other commands (`ceph pg ls peering`, `ceph pg force-recovery`, `ceph osd purge`, `ceph osd set noout`, Rook kubectl labels) are correct and current.
- The Rook OSD pod labels (`app=rook-ceph-osd`, `ceph-osd-id=7`) are correct for current Rook versions.
- The explanation of peering behavior (PG inaccessible during peering, OSDs must reach consensus) is technically accurate.
