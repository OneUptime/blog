# Validation Summary: How to Manage Backup Configurations with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications
- Argo CD ApplicationSets
- Kubernetes CronJobs
- Velero Helm chart
- Velero Schedule, BackupStorageLocation, and Restore custom resources
- PostgreSQL backup consistency considerations

## Sources Consulted
- Velero v1.18 Schedule API Type: https://velero.io/docs/v1.18/api-types/schedule/
- Velero v1.18 BackupStorageLocation API Type: https://velero.io/docs/v1.18/api-types/backupstoragelocation/
- Velero v1.18 Restore API Type: https://velero.io/docs/v1.18/api-types/restore/
- Velero Restore Reference: https://velero.io/docs/v1.18/restore-reference/
- VMware Tanzu Velero Helm chart values and chart metadata: https://github.com/vmware-tanzu/helm-charts/tree/main/charts/velero
- Argo CD ApplicationSet Cluster Generator docs: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- PostgreSQL current continuous archiving and low-level backup API docs: https://www.postgresql.org/docs/current/continuous-archiving.html
- PostgreSQL 15 release notes: https://www.postgresql.org/docs/15/release-15.html

## Issues Found
- The Velero Helm chart and AWS plugin versions were outdated for a 2026 post. Updated the chart from `6.0.0` to `12.0.1` and the AWS plugin from `v1.9.0` to `v1.13.1`, matching current chart metadata/examples.
- The ApplicationSet example used legacy template placeholders and `{{name}}`, which can create invalid Kubernetes names for cluster names containing characters such as underscores. Updated the example to use Go templates, `missingkey=error`, `{{.nameNormalized}}`, `{{.server}}`, and `{{.metadata.labels.environment}}`.
- The PostgreSQL hook used `pg_start_backup()` and `pg_stop_backup()`. These functions were renamed in PostgreSQL 15, and Velero pre/post exec hooks do not keep the same database connection open as required by PostgreSQL's low-level backup API. Replaced the example with a `CHECKPOINT` pre-hook and corrected the explanatory text to recommend database-native backups/WAL archiving for production consistency.
- Velero backup hooks only support pod exec hooks for resources. Added `includedResources: [pods]` to the hook example.
- The backup health check comment claimed to check the last two hours, but the script checks the most recent five backup objects. Updated the comment to match the script behavior.

## Review Notes
The YAML snippets parse successfully. The examples are still illustrative and require environment-specific secrets, IAM permissions, storage buckets, and database backup policy decisions before production use.
