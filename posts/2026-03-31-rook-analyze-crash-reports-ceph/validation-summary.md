# Validation Summary: How to Analyze Crash Reports in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (crash module, crash reporting subsystem)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl commands for accessing Rook-managed pods)
- Python 3 (JSON parsing of crash output)

## Sources Consulted
- Ceph official documentation: crash module and `ceph crash` CLI commands (https://docs.ceph.com/en/latest/rados/operations/crash/)
- Ceph CLI reference for `ceph crash ls`, `ceph crash info`, `ceph crash stat`, `ceph crash archive` subcommands
- Rook documentation for Ceph toolbox usage (https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/)

## Issues Found
1. **`ceph crash ls` example output format was inaccurate** — The example showed `2026-03-10_14:23:01.123456Z_osd.5    1 osd.5` with a trailing count and entity name. The actual output of `ceph crash ls` lists crash IDs one per line without the appended count and entity. Fixed by removing the trailing `1 osd.5` / `1 mgr.a` from each line.

2. **`ceph crash ls-new` description was misleading** — The introductory text said "List crashes with timestamps" which incorrectly implies that `ls-new` adds timestamps compared to `ls`. Both commands show timestamps. The actual distinction is that `ls-new` filters to only show unacknowledged (not yet archived) crashes. Fixed by changing the description to "List unacknowledged crashes."

3. **`ceph crash stat` example output format was inaccurate** — The example showed "2 clients reported crashes in the last week:" which does not match the actual `ceph crash stat` output format. The real output uses "crashes recorded" phrasing. Fixed to show "2 crashes recorded" followed by daemon type counts.

## Review Notes
- The JSON structure shown in the `ceph crash info` example is representative and includes valid fields (`crash_id`, `timestamp`, `process_name`, `entity_name`, `ceph_version`, `backtrace`). Real crash reports may include additional fields like `os_name`, `os_version`, `os_id`, `kernel_version`, `assert_condition`, and `assert_msg`.
- The Python parsing script correctly uses `.get()` for safe access and handles missing fields gracefully.
- The Rook-specific section accurately describes accessing crash data via pod logs (`--previous` flag for crashed containers) and the Ceph toolbox deployment.
- The crash directory path `/var/lib/ceph/crash/posted/` is correct for crashes that have already been posted to the crash module.
