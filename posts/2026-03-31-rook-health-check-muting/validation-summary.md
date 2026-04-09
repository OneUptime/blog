# Validation Summary: How to Manage Health Check Muting and Unmuting in Ceph

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Ceph (health check muting system, introduced in Octopus 15.2.x)
- Rook (Kubernetes operator for Ceph)
- kubectl (Kubernetes CLI)

## Sources Consulted
- Ceph Monitoring Documentation: https://github.com/ceph/ceph/blob/main/doc/rados/operations/monitoring.rst
- Ceph Health Checks Reference: https://docs.ceph.com/en/reef/rados/operations/health-checks/
- Ceph PR #29422 (added health mute feature): https://github.com/ceph/ceph/pull/29422
- Ceph v15.2.0 Octopus Release Notes: https://ceph.io/en/news/blog/2020/v15-2-0-octopus-released/
- Ceph health_check.h source: https://github.com/ceph/ceph/blob/main/src/mon/health_check.h

## Issues Found

### Issue 1: Incorrect Ceph version for feature introduction
- **What was wrong:** The post stated "Ceph 16.x+" (Pacific) introduced the health check muting system.
- **What was changed:** Corrected to "Ceph 15.x+ (Octopus and later)". The `ceph health mute` feature was introduced in Ceph Octopus (15.2.0), released March 2020, via PR #29422.
- **Why:** The Octopus release notes explicitly list health alert muting as a new feature. Pacific continued to support it but did not introduce it.

### Issue 2: Invalid health check codes `noscrub` and `nodeep-scrub`
- **What was wrong:** The "Common Health Check Codes" table listed `noscrub` and `nodeep-scrub` as health check codes. These are OSD map flags, not health check codes. Running `ceph health mute noscrub` would not work.
- **What was changed:** Replaced both entries with a single `OSDMAP_FLAGS` entry, which is the actual health check code raised when OSD map flags like noscrub or nodeep-scrub are set.
- **Why:** When `noscrub` or `nodeep-scrub` flags are set via `ceph osd set`, the health warning is reported under the code `OSDMAP_FLAGS`, not under the flag names themselves.

## Review Notes
- The Python script for parsing muted health checks from JSON output is functional, though the `ttl` field in the JSON is an absolute timestamp (`utime_t`), not a human-readable remaining duration. The script will print the raw timestamp value, which is technically correct but may not be as user-friendly as implied.
- The TTL duration format `1d` (days) used in one example is commonly supported by the Ceph duration parser but is not explicitly listed in the primary documentation which shows `s`, `m`, and `h` as units. It works in practice.
- The `--sticky` flag for `ceph health mute` (which makes mutes persist across cluster restarts) is not mentioned. This is not an error — the post doesn't claim mutes survive restarts — but could be a useful addition in the future.
- The maintenance window script uses an unquoted `$TOOLBOX` variable expansion, which works as intended for word-splitting the kubectl command but is worth noting as a shell scripting pattern that could break if paths contain spaces.
