# Validation Summary: How to Enable and Disable Ceph Manager Modules

## Status
validated

## Post Type
Tutorial / Administration Guide

## Technologies Covered
- Ceph (Storage cluster)
- Ceph Manager (ceph-mgr) daemon and module system
- Rook (Kubernetes Ceph operator, referenced in tags)
- systemd / journalctl (for log viewing)

## Sources Consulted
- Ceph Manager Administrator Guide: https://docs.ceph.com/en/latest/mgr/administrator/
- Ceph Monitoring Documentation: https://docs.ceph.com/en/reef/rados/operations/monitoring/
- Ceph Operating a Cluster Guide: https://docs.ceph.com/en/latest/rados/operations/operating/
- Ceph Tracker Issue #45322 (mgr module ls output simplification)
- Red Hat Bugzilla #1891398 (always-on module disable error behavior)
- Ceph GitHub PR #60563 (force disable always-on modules)
- Ceph GitHub PR #23558 (always-on modules introduction)

## Issues Found
1. **Incorrect error message for disabling always-on modules**: The post showed `Error: module 'balancer' is always-on` but the actual Ceph error message is `Error EINVAL: module 'balancer' cannot be disabled (always-on)`. Fixed the error message to match the real output.

## Review Notes
- The `disabled_modules` section in the JSON output of `ceph mgr module ls` may contain objects with additional fields (`can_run`, `error_string`, `module_options`) rather than simple strings, depending on the Ceph version and output format. The blog's simplified representation is acceptable for illustration purposes.
- The list of always-on modules has grown over Ceph releases. The five listed (`balancer`, `crash`, `devicehealth`, `orchestrator`, `pg_autoscaler`) are correct for modern releases, but the full list also includes `progress`, `rbd_support`, `status`, `volumes`, and in newer releases `osd_support` and `telemetry`.
- The `--force` flag for `ceph mgr module enable` is primarily documented for bypassing the check that all mgr daemons support the module, not just for missing dependencies. The blog's description is close enough but slightly imprecise.
- The `journalctl -u ceph-mgr@*` pattern is correct for traditional package-based Ceph deployments. For cephadm (containerized) deployments, the systemd unit naming differs (`ceph-<fsid>@mgr.<hostname>.<id>.service`), so a different pattern would be needed.
- Starting with recent Ceph versions (Squid/Tentacle era), a new `ceph mgr module force disable <module>` command was introduced to allow forcibly disabling always-on modules for cluster recovery purposes.
