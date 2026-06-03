# Validation Summary: How to Configure Velero TTL to Automatically Delete Old Backup Archives

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Velero
- Velero Backup and Schedule custom resources
- Velero CLI
- Prometheus alerting
- Amazon S3 lifecycle policies

## Sources Consulted
- Velero v1.18 "How Velero Works" documentation: https://velero.io/docs/v1.18/how-velero-works/
- Velero v1.18 Backup API Type documentation: https://velero.io/docs/v1.18/api-types/backup/
- Velero v1.18 Schedule API Type documentation: https://velero.io/docs/v1.18/api-types/schedule/
- Velero metrics source code: https://raw.githubusercontent.com/vmware-tanzu/velero/main/pkg/metrics/metrics.go
- Velero Backup CRD source: https://raw.githubusercontent.com/vmware-tanzu/velero/main/config/crd/v1/bases/velero.io_backups.yaml
- Velero issue discussion on extending backup expiration: https://github.com/velero-io/velero/issues/3042
- Amazon S3 lifecycle configuration examples: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-configuration-examples.html

## Issues Found
- The post said Velero TTL accepts duration strings like `7d`. Velero documents TTL as a duration in hours, minutes, and seconds, so this was changed to `168h`.
- The weekly and monthly schedule examples used `labelSelector` to label backup types. `labelSelector` filters backed-up Kubernetes resources; schedule template `metadata.labels` is the correct way to label backup objects, so the examples were corrected.
- The existing-backup retention section changed `spec.ttl`, but Velero uses `status.expiration` to determine when an existing backup is eligible for garbage collection. The examples were updated to edit and patch `status.expiration`.
- The post claimed setting `--ttl 0` keeps a backup indefinitely. Velero TTL is the time before a backup is eligible for garbage collection, and the CLI expects duration strings. The section was changed to recommend an explicitly long TTL for long retention.
- The PrometheusRule used non-existent metrics: `velero_backup_expiration_timestamp_seconds` and `velero_backup_deletion_total`. The alert rules were updated to use Velero's current deletion metrics, `velero_backup_deletion_success_total` and `velero_backup_deletion_failure_total`.
- The S3 lifecycle JSON snippet included a JavaScript-style comment and used the older top-level `Prefix` form. The example was corrected to valid JSON using `Filter.Prefix`.

## Review Notes
Velero's garbage collection is not immediate; the official documentation notes that expiration is applied when the GC controller runs its reconciliation loop, hourly by default. Existing backup expiration edits may not persist through object-storage sync after reinstalling or moving Velero unless the backup object is edited again after sync.
