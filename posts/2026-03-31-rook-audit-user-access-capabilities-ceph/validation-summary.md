# Validation Summary: How to Audit User Access and Capabilities in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (auth subsystem, RGW / RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl exec, CronJob)
- radosgw-admin CLI

## Sources Consulted
- Ceph official documentation: User Management (`ceph auth` commands) — https://docs.ceph.com/en/latest/rados/operations/user-management/
- Ceph official documentation: RGW Admin Ops / Usage — https://docs.ceph.com/en/latest/radosgw/adminops/#usage
- Ceph official documentation: `radosgw-admin` CLI — https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Rook documentation: Ceph Toolbox — https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Kubernetes API reference: CronJob batch/v1 — https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found

### 1. RGW section: `radosgw-admin usage trim` mislabeled as "Enable usage logging"
- **What was wrong:** The comment said "Enable usage logging in RGW" but the command was `radosgw-admin usage trim --uid=admin --start-date=...`, which *deletes* usage log entries rather than enabling logging. This is the opposite of what the section intends.
- **What was changed:** Replaced the `radosgw-admin usage trim` command with `ceph config set client.rgw rgw_enable_usage_log true`, which is the correct way to enable RGW usage logging via the Ceph config system.
- **Why:** The `rgw_enable_usage_log` config option controls whether RGW records per-user usage statistics. Setting it to `true` enables the logging that `radosgw-admin usage show` then queries.

### 2. CronJob: Missing Ceph cluster connection configuration (volume mounts)
- **What was wrong:** The CronJob container had no volume mounts for the Ceph config file (`ceph.conf`) or admin keyring. Without these, `ceph auth export` cannot connect to the Ceph cluster and the job would fail immediately.
- **What was changed:** Added `volumeMounts` for `/etc/ceph/ceph.conf` (from the `rook-ceph-config` ConfigMap) and `/etc/ceph/keyring` (from the `rook-ceph-admin-keyring` Secret), along with the corresponding `volumes` definitions.
- **Why:** Any standalone container running Ceph CLI commands needs the cluster config and an authentication keyring to connect to the monitors.

### 3. CronJob: Broken diff against non-existent previous audit file
- **What was wrong:** The command `diff /tmp/audit-previous.txt /tmp/audit-$(date +%Y%m%d).txt` references a "previous" audit file that would never exist because pod storage is ephemeral — each CronJob run starts with a fresh filesystem.
- **What was changed:** Replaced the broken diff-based command with a working approach that lists all auth entities and highlights those with wildcard (`allow *`) access. This produces useful audit output without requiring persistent storage.
- **Why:** Making the diff approach work correctly would require a PersistentVolumeClaim and a mechanism to rename the current export to "previous" after each run, which is beyond the scope of this introductory example.

## Review Notes
- All other `ceph auth` commands (`auth list`, `auth get`, `auth export`, `auth caps`) are correct and use proper syntax.
- The `kubectl exec` pattern targeting `deploy/rook-ceph-tools` is the standard Rook toolbox access method.
- The `grep` pipelines for finding over-privileged accounts use correct flag combinations and regex patterns.
- The `ceph auth caps` command correctly replaces all capabilities for an entity (not additive), which matches the least-privilege intent described in the post.
- The CronJob uses `apiVersion: batch/v1` which is correct for Kubernetes 1.21+ (CronJob graduated to stable).
- The `rook/ceph:latest` image in the CronJob contains Ceph tools but is the full Rook operator image; a lighter alternative would be the base Ceph image (e.g., `quay.io/ceph/ceph:v18`), though both work.
