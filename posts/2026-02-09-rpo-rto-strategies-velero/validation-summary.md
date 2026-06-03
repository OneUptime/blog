# Validation Summary: How to Build RPO and RTO Strategies for Kubernetes Workloads Using Velero

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Velero
- Velero Schedule and Restore custom resources
- Velero CLI
- Bash
- Python
- Prometheus Pushgateway

## Sources Consulted
- Velero v1.18 Schedule API Type: https://velero.io/docs/v1.18/api-types/schedule/
- Velero v1.18 Restore API Type: https://velero.io/docs/v1.18/api-types/restore/
- Velero v1.18 Restore Reference: https://velero.io/docs/v1.18/restore-reference/
- Velero v1.18 Velero Install CLI: https://velero.io/docs/v1.18/velero-install/
- Velero v1.18 Resource Filtering: https://velero.io/docs/v1.18/resource-filtering/
- Velero v1.18 Backup Hooks: https://velero.io/docs/v1.18/backup-hooks/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The AWS `velero install` example omitted the required provider plugin and credentials input. Added `--plugins velero/velero-plugin-for-aws:v1.14.0` and `--secret-file ./aws-iam-creds`.
- Restore examples used placeholder names such as `latest-backup` and `latest-critical` as if Velero resolved them automatically. Replaced them with explicit backup names.
- The "Parallel restore operations" ConfigMap used unsupported keys for server restore ordering and restore item timeout. Replaced it with the documented `--restore-resource-priorities` server flag and a Restore CR using `itemOperationTimeout` and `uploaderConfig.parallelFilesDownload`.
- The RTO CronJob used `velero/velero:latest` with `/bin/bash` and `kubectl`, but the Velero image does not include a shell. Replaced it with a kubectl-based job that creates a Velero Restore CR directly.
- The RTO CronJob generated a new timestamp for the namespace at each use, so create, restore, and cleanup operations could refer to different namespace names. Added variables for a stable test namespace and restore name.
- The RTO CronJob used the CLI flag `--namespace-mappings`; the equivalent Restore CRD field is `spec.namespaceMapping`. Updated the example accordingly.

## Review Notes
The Schedule, Restore, label selector, hook, namespace filtering, TTL, and Python examples are syntactically valid. The database backup-hook example is structurally correct for Velero, but production database RPO should still be validated against database-native backup and point-in-time recovery requirements.
