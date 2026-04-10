# Validation Summary: How to Configure Crash Report Retention in Ceph

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph (crash module, manager configuration)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (CronJob, kubectl, pod exec)

## Sources Consulted
- Ceph official documentation: Crash Module - https://docs.ceph.com/en/latest/mgr/crash/
- Ceph official documentation: Health Checks (RECENT_CRASH) - https://docs.ceph.com/en/latest/rados/operations/health-checks/#recent-crash

## Issues Found

1. **`ceph crash prune` argument is in days, not seconds.** The post originally described the argument as `<keep-for-seconds>` and used `ceph crash prune 2592000` for 30 days. The `ceph crash prune` command takes an integer number of **days**, not seconds. Using `2592000` would mean ~7,100 years. Fixed to `ceph crash prune <keep-days>` and `ceph crash prune 30`.

2. **CronJob also used seconds instead of days.** The CronJob YAML specified `"2592000"` as the prune argument. Fixed to `"30"` to correctly prune crashes older than 30 days.

3. **`find` command targeted nonexistent `*.crash` files.** Ceph stores crash data in subdirectories (named by timestamp and UUID) containing `meta` JSON files and log files, not as `*.crash` files. The `find` command was corrected to target crash directories: `find /var/lib/ceph/crash -mindepth 1 -maxdepth 1 -type d -not -name "posted" -mtime +30 -exec rm -rf {} +`.

## Review Notes
- The CronJob example is simplified and would need Ceph config/keyring mounts to actually connect to the cluster in a real Rook deployment. This is acceptable for a tutorial but readers should be aware.
- The `rook/ceph:latest` image in the CronJob is the Rook operator image. For a dedicated tools pod, the Rook toolbox image or a Ceph base image may be more appropriate.
- The `mgr/crash/warn_recent_interval` and `mgr/crash/retain_interval` config options correctly use seconds as their unit (consistent with Ceph config time interval handling), which is distinct from the `ceph crash prune` CLI command that uses days.
