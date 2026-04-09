# Validation Summary: How to Prioritize Backfill and Recovery for PGs in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- Ceph CLI (`ceph config`, `ceph pg`, `ceph progress`)
- Ceph OSD recovery and backfill subsystems
- Placement Groups (PGs)

## Sources Consulted
- Ceph official documentation: OSD configuration reference (https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/)
- Ceph official documentation: Placement Group concepts (https://docs.ceph.com/en/latest/rados/operations/placement-groups/)
- Ceph official documentation: `ceph config` CLI reference (https://docs.ceph.com/en/latest/man/8/ceph/#config)
- Ceph official documentation: Recovery and backfill tuning (https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/#backfill)
- Ceph official documentation: `ceph pg` subcommands (https://docs.ceph.com/en/latest/man/8/ceph/#pg)

## Issues Found

### Issue 1: Incorrect `ceph config` subcommand for querying specific keys
- **What was wrong:** The post used `ceph config show osd.0 <key>` to check specific configuration values. The `ceph config show <who>` command dumps the entire running configuration for a daemon and does not accept a specific key as a filter argument.
- **What was changed:** Replaced `ceph config show` with `ceph config get` which correctly retrieves a specific configuration value from the monitor's config store (e.g., `ceph config get osd.0 osd_recovery_op_priority`).
- **Why:** Using the wrong subcommand would either produce an error or dump all config instead of the desired value, confusing readers.

### Issue 2: Non-existent `ceph osd recovery-stats` command
- **What was wrong:** The post listed `ceph osd recovery-stats` as a command for monitoring recovery progress. This command does not exist in the Ceph CLI.
- **What was changed:** Replaced with `ceph progress`, which is the correct CLI command for tracking ongoing recovery and backfill operations.
- **Why:** Running a non-existent command would produce an error, and readers would be unable to monitor recovery as described.

## Review Notes
- All config parameter names (`osd_recovery_op_priority`, `osd_max_backfills`, `osd_recovery_max_active`, `osd_recovery_max_single_start`, `osd_backfill_scan_min`, `osd_backfill_scan_max`, `osd_recovery_sleep`, `osd_recovery_sleep_hdd`, `osd_recovery_sleep_ssd`) are valid Ceph OSD tunables.
- The `ceph pg force-recovery`, `ceph pg force-backfill`, `ceph pg cancel-force-recovery`, and `ceph pg cancel-force-backfill` commands are all valid and correctly documented.
- The default value of 3 for `osd_recovery_op_priority` is correct for recent Ceph releases.
- The conceptual explanation of recovery vs backfill is accurate: recovery re-replicates from existing copies after OSD failure, while backfill migrates data when PGs are remapped to new OSDs.
- The recommended tuning values (priority 63 for fast recovery, priority 1 for throttled recovery) are reasonable and commonly used in production.
