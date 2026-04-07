# Validation Summary: How to Set the Noautoscale Flag in Ceph

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (PG autoscaler, OSD flags, pool configuration)
- Rook (Ceph orchestration on Kubernetes)
- Bash scripting (maintenance window example)

## Sources Consulted
- Ceph official documentation on PG autoscaler: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph official documentation on OSD flags: https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/
- Ceph CLI reference for `ceph osd set/unset`: https://docs.ceph.com/en/latest/man/8/ceph/

## Issues Found
No technical issues found.

## Review Notes
- The `noautoscale` flag was introduced in Ceph Nautilus (14.x). The post does not specify a minimum version, which is acceptable since Nautilus and all subsequent releases support it and older releases are EOL.
- All CLI commands (`ceph osd set noautoscale`, `ceph osd unset noautoscale`, `ceph osd pool autoscale-status`, `ceph osd pool set <pool> pg_autoscale_mode`) are syntactically correct and current.
- The default OSD flags shown in example output (`sortbitwise,recovery_deletes,purged_snapdirs,pglog_hardlimit`) are representative of modern Ceph clusters.
- The maintenance script example is straightforward and correct, though production use would benefit from error checking (not a correctness issue).
