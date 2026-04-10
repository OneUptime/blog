# Validation Summary: How to Create a Ceph Quick Start Cheat Sheet

## Status
validated

## Post Type
Reference / Cheat Sheet

## Technologies Covered
- Ceph (cluster health, OSD, pool, PG, MON subsystems)
- RADOS (low-level object store CLI)
- RBD (RADOS Block Device CLI)
- Rook (mentioned in tags, not directly in commands)

## Sources Consulted
- Ceph official documentation: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph OSD management docs: https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/
- Ceph pool operations docs: https://docs.ceph.com/en/latest/rados/operations/pools/
- RBD command reference: https://docs.ceph.com/en/latest/man/8/rbd/
- RADOS command reference: https://docs.ceph.com/en/latest/man/8/rados/
- Ceph config reference: https://docs.ceph.com/en/latest/rados/configuration/ceph-conf/

## Issues Found
1. **Incorrect comment on `ceph log last 50`**: The comment described this as "Last 50 audit log entries" but `ceph log last` retrieves entries from the **cluster log**, not the audit log. The Ceph audit log is a separate facility that records authenticated operations and is written to dedicated audit log files by MON and MGR daemons. Fixed the comment to "Last 50 cluster log entries".

## Review Notes
- `ceph osd lspools` is a legacy alias for `ceph osd pool ls`. It still works but could be noted as deprecated in favor of the newer syntax. Not changed since it remains functional.
- All CLI commands are syntactically correct and use valid flags and options for current Ceph releases (Reef/Squid).
- The `ceph osd pool create POOL 32` syntax with an explicit PG count is valid, though modern Ceph (Nautilus+) supports PG autoscaling and the PG count argument is now optional. The explicit form shown is still correct and commonly used.
- The `ceph pg dump_stuck` commands use underscore syntax which remains supported. The post is accurate as-is.
