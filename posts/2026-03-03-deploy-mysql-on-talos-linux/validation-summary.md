# Validation Summary: How to Deploy MySQL on Talos Linux

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Talos Linux (machine config, talosctl)
- Kubernetes (StatefulSet, Service, ConfigMap, Secret, CronJob, Deployment)
- MySQL 8.0
- MySQL Operator for Kubernetes (InnoDBCluster CRD)
- Prometheus mysqld-exporter
- mysqldump (backups)

## Sources Consulted
- Talos Linux v1alpha1 config reference: https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/
- talosctl CLI reference: https://docs.siderolabs.com/talos/v1.7/reference/cli/
- MySQL 8.0 Binary Log Options: https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html
- MySQL Operator (InnoDBCluster, simple kubectl): https://dev.mysql.com/doc/mysql-operator/en/mysql-operator-innodbcluster-simple-kubectl.html
- MySQL Operator deploy manifests: https://github.com/mysql/mysql-operator/tree/trunk/deploy
- prometheus/mysqld_exporter README: https://github.com/prometheus/mysqld_exporter
- Kubernetes StatefulSet / probe variable expansion: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found

1. **`talosctl apply-config` used with a partial config file (Step 1).**
   `apply-config` expects a complete machine config and will reject a YAML fragment containing only `machine.disks` / `machine.kubelet.extraMounts`. The correct command for applying a partial patch to a running node is `talosctl patch machineconfig --patch @file.yaml`. Updated the command accordingly.

2. **`expire_logs_days = 7` in the MySQL ConfigMap (Step 5).**
   Deprecated in MySQL 8.0 in favor of `binlog_expire_logs_seconds`. Using it produces a deprecation warning and can conflict with the new variable. Replaced with `binlog_expire_logs_seconds = 604800` (7 days expressed in seconds), matching the author's clear intent.

3. **mysqld-exporter `DATA_SOURCE_NAME` env var (Monitoring section).**
   Removed in mysqld-exporter v0.15.0 (Aug 2023). Using `prom/mysqld-exporter:latest` with `DATA_SOURCE_NAME` no longer works. Replaced with the current configuration approach: `--mysqld.address` and `--mysqld.username` flags plus the `MYSQLD_EXPORTER_PASSWORD` environment variable, sourced from the existing `mysql-credentials` Secret.

4. **InnoDBCluster `secretName` referencing the wrong secret format (HA section).**
   The `mysql.oracle.com/v2` InnoDBCluster CRD requires a Secret with keys `rootUser`, `rootHost`, and `rootPassword`. The existing `mysql-credentials` Secret uses MySQL container image conventions (`MYSQL_ROOT_PASSWORD`, etc.), which the operator will not recognize. Added a dedicated `mysql-cluster-secret` Secret with the required keys and updated `spec.secretName` to reference it, with a short explanatory sentence.

## Review Notes

- The `/dev/sdb` device path in the Talos disk patch works but is not stable across reboots; Talos documentation recommends `/dev/disk/by-id/...` for production. Not changed because the post's storage section is illustrative.
- The readiness probe interpolates `$(MYSQL_ROOT_PASSWORD)` via Kubernetes variable substitution in `exec.command`, which is valid (env var is provided via `envFrom`). Exposing the password on the command line is suboptimal versus using `MYSQL_PWD`, but it is technically correct and not a defect.
- The MySQL Operator deploy URLs on the `trunk` branch are correct and current.
- `prom/mysqld-exporter:latest` is acceptable for a tutorial; pinning to a specific tag would be more reproducible but is a style preference, not a correctness issue.
