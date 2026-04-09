# Validation Summary: How to Use Sticky Mute for Health Checks in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (health mute/unmute subsystem)
- Rook (Ceph operator for Kubernetes)
- kubectl (Kubernetes CLI)
- Python 3 (for JSON parsing in verification script)

## Sources Consulted
- [Ceph Monitoring a Cluster (official docs)](https://docs.ceph.com/en/latest/rados/operations/monitoring/) — covers `ceph health mute`, `--sticky` flag, TTL syntax, and `ceph health unmute`
- [Ceph Health Checks Reference (official docs)](https://docs.ceph.com/en/latest/rados/operations/health-checks/) — confirms OSD_DOWN and MON_CLOCK_SKEW as valid health check codes
- [Ceph source: health_check.h](https://github.com/ceph/ceph/blob/main/src/mon/health_check.h) — `health_mute_t` struct confirming JSON fields: `code`, `sticky`, `ttl`, `summary`, `count`
- [Ceph source: monitoring.rst](https://github.com/ceph/ceph/blob/main/doc/rados/operations/monitoring.rst) — canonical documentation source

## Issues Found
No technical issues found. All commands, flags, health check codes, and behavioral descriptions are accurate.

## Review Notes
- The `ttl` field in Ceph's JSON output (`ceph health detail --format json`) is an absolute timestamp (`utime_t`), not a human-readable remaining-duration string. The sample output showing `ttl=3h 47m` is illustrative but may not match the raw JSON format, which would be something like `"2026-04-09 14:00:00.000000"` or `"0.000000"` for no TTL. The Python script logic is correct and would display whatever value the field contains.
- The documentation also notes that standard (non-sticky) mutes disappear not only when the condition clears but also when the condition **worsens** (e.g., additional OSDs go down). Sticky mutes prevent this behavior as well. The post focuses on the clear/recur scenario, which is the primary use case and is correctly described, but doesn't mention the worsening-condition behavior.
- All `kubectl exec` commands correctly target `deploy/rook-ceph-tools` in the `rook-ceph` namespace, which is the standard Rook toolbox deployment.
