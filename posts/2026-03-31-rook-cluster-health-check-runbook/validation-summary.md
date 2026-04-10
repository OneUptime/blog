# Validation Summary: How to Create a Ceph Cluster Health Check Runbook

## Status
validated

## Post Type
Tutorial / Runbook Guide

## Technologies Covered
- Ceph (distributed storage)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (CronJob, kubectl exec, ConfigMaps, Secrets)
- Bash scripting

## Sources Consulted
- Ceph Monitoring OSDs and PGs documentation: https://docs.ceph.com/en/reef/rados/operations/monitoring-osd-pg/
- Ceph Health Checks documentation: https://docs.ceph.com/en/reef/rados/operations/health-checks/
- Ceph Troubleshooting Monitors: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-mon/
- Rook Ceph Toolbox documentation: https://rook.io/docs/rook/latest-release/Troubleshooting/ceph-toolbox/
- Rook Direct Tools documentation: https://rook.io/docs/rook/latest/Troubleshooting/direct-tools/

## Issues Found

### 1. Incorrect capacity thresholds (Step 5)
- **What was wrong:** The post stated "warn at 75%, critical at 85%, full at 95%". The Ceph defaults are nearfull at 85% (`mon_osd_nearfull_ratio`), backfillfull at 90% (`mon_osd_backfillfull_ratio`), and full at 95% (`mon_osd_full_ratio`). There is no default 75% threshold in Ceph.
- **What was changed:** Updated to "nearfull at 85%, backfillfull at 90%, full at 95%".

### 2. Script uses `-it` flags in non-interactive context (Step 6)
- **What was wrong:** The health check bash script used `kubectl exec -it` which allocates a TTY. When run as a script or CronJob (non-interactive), the `-t` flag produces warnings like "Unable to use a TTY" and can corrupt output with carriage returns.
- **What was changed:** Removed `-it` flags from all `kubectl exec` commands in the script template.

### 3. CronJob missing volume mounts and using invalid env var (Step 7)
- **What was wrong:** The CronJob used `ROOK_CEPH_USERNAME` as an environment variable, which is not a valid Ceph or Rook configuration mechanism. Ceph authenticates via keyring files, not environment variables. Additionally, the container had no volume mounts for the Ceph config or admin keyring, so `ceph status` would fail with connection/auth errors.
- **What was changed:** Removed the `ROOK_CEPH_USERNAME` env var. Added volume mounts for `ceph.conf` (from the `rook-ceph-config` ConfigMap) and the admin keyring (from the `rook-ceph-admin-keyring` Secret).

## Review Notes
- All Ceph CLI commands referenced in the post (`ceph status`, `ceph health detail`, `ceph osd stat`, `ceph osd tree`, `ceph pg stat`, `ceph pg dump_stuck`, `ceph mon stat`, `ceph quorum_status`, `ceph df`, `ceph osd df`) are valid and current.
- The interactive commands in Steps 1-5 correctly use `-it` since they are intended for manual operator use.
- The `rook/ceph:v1.13.0` image is valid and contains Ceph CLI tools, though operators should update to their deployed Rook version.
- The exact Secret and ConfigMap names for Ceph config (`rook-ceph-config`, `rook-ceph-admin-keyring`) are standard for Rook deployments but may vary depending on the Rook version and cluster configuration. Operators should verify the resource names in their specific environment.
