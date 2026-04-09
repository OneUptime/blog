# Validation Summary: How to Set Recovery and Operation Priorities for Pools

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage system)
- Ceph OSD recovery and backfill configuration
- Kubernetes (kubectl, ConfigMap)

## Sources Consulted
- Ceph Pool Operations documentation: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph OSD Config Reference: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph source code PR #28677 (HDD/SSD variants for osd_recovery_max_active)
- Ceph source code PR #26705 (docs improvement for recovery priority parameters)
- Rook documentation on configuration overrides

## Issues Found

1. **Incorrect comment for `osd_recovery_op_priority`**: The comment on the `ceph config set osd osd_recovery_op_priority 3` command in the "Global Recovery Throttling" section said "Max recovery chunk size". This is wrong -- `osd_recovery_op_priority` controls the I/O scheduling priority of recovery operations (1-63), not chunk size. The chunk size parameter is a separate setting (`osd_recovery_max_chunk`). Fixed the comment to say "Recovery operation priority (1-63, default: 3)".

2. **Incorrect default and range for pool-level `recovery_op_priority`**: The post claimed the range is "1-63, default: 3". The pool-level `recovery_op_priority` parameter defaults to 0, which means "inherit from the global `osd_recovery_op_priority` setting" (whose default is 3). The range starts at 0, not 1. Fixed to "0-63, default: 0 means inherit from global osd_recovery_op_priority".

3. **Outdated default for `osd_recovery_max_active`**: The post claimed the default is 3. In modern Ceph (Nautilus and later), the default is 0, which auto-selects based on device type: 3 for HDD (`osd_recovery_max_active_hdd`) and 10 for SSD (`osd_recovery_max_active_ssd`). Fixed the comment to reflect the modern default behavior.

## Review Notes
- The `recovery_priority` pool parameter range of -10 to 10 with default 0 is correct per official Ceph documentation.
- The `osd_recovery_delay_start` default of 0 is correct.
- The `osd_max_backfills` default of 1 is correct.
- The Rook `rook-config-override` ConfigMap format and syntax are correct.
- The `ceph osd pool stats` sample output format is realistic.
- The post could mention the `osd_recovery_max_active_hdd` and `osd_recovery_max_active_ssd` parameters for completeness, but this is not an error.
