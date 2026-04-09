# Validation Summary: How to Fix MGR_MODULE_ERROR Health Check in Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (Manager / MGR daemon)
- Rook (Kubernetes Ceph operator)
- Prometheus (alerting rules)
- Kubernetes (kubectl log inspection)

## Sources Consulted
- Ceph CLI reference for `ceph mgr module` subcommands (`enable`, `disable`, `ls` are the valid subcommands; `info` does not exist)
- Ceph MGR Prometheus module metric documentation (`ceph_health_detail` gauge with `name` label for per-health-check alerting)
- Ceph dashboard, pg_autoscaler, and balancer module documentation

## Issues Found

1. **Invalid command `ceph mgr module info pg_autoscaler`** (line 39-40): The `ceph mgr module info` subcommand does not exist in the Ceph CLI. Valid subcommands are `enable`, `disable`, and `ls`. Running the original command would return `Error EINVAL: invalid command`. Fixed by replacing with `ceph mgr module ls`, which outputs JSON containing module status and error details for all modules.

2. **Overly broad Prometheus alert expression** (line 143): The original expression `ceph_health_status > 0` fires on any Ceph health warning or error, not specifically on MGR_MODULE_ERROR. This is misleading in a post specifically about module errors. Fixed by replacing with `ceph_health_detail{name="MGR_MODULE_ERROR"} == 1`, which targets the specific health check using the `ceph_health_detail` gauge metric exposed by the Ceph MGR Prometheus module.

## Review Notes
- All other commands (`ceph mgr module disable/enable`, `ceph osd pool autoscale-status`, `ceph osd pool set ... pg_autoscale_mode off`, `ceph dashboard create-self-signed-cert`, `ceph config set mgr mgr/dashboard/ssl false`, `ceph balancer status/off/on`, `ceph config-key dump`, `ceph config rm`, `ceph mgr fail`) are correct.
- The MGR failover one-liner using `ceph mgr stat` piped to Python to extract `active_name` is a valid and correct approach.
- The distinction between `MGR_MODULE_ERROR` (runtime failure) and `MGR_MODULE_DEPENDENCY` (missing prerequisites) is accurate.
