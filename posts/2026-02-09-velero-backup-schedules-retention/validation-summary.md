# Validation Summary: How to Configure Velero Backup Schedules with Retention Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Velero
- Kubernetes
- AWS S3 backup storage
- Kubernetes custom resources
- Prometheus alerting
- Go controller-runtime

## Sources Consulted
- Velero Schedule API Type: https://velero.io/docs/main/api-types/schedule/
- Velero Backup Reference: https://velero.io/docs/main/backup-reference/
- Velero Schedule CRD schema: https://github.com/velero-io/velero/blob/main/config/crd/v1/bases/velero.io_schedules.yaml
- Velero metrics source: https://github.com/velero-io/velero/blob/main/pkg/metrics/metrics.go
- Velero labels and annotations source: https://github.com/velero-io/velero/blob/main/pkg/apis/velero/v1/labels_annotations.go
- Velero DeleteBackupRequest API source: https://github.com/velero-io/velero/blob/main/pkg/apis/velero/v1/delete_backup_request_types.go
- Velero plugin for AWS releases: https://github.com/velero-io/velero-plugin-for-aws/releases

## Issues Found
- The AWS installation command used `velero/velero-plugin-for-aws:v1.9.0`, which is outdated for current Velero guidance. Updated it to `v1.13.1`, the current AWS plugin release reviewed during validation.
- The Schedule YAML examples placed generated backup labels directly under `spec.template.labels`. Current Velero Schedule templates use `spec.template.metadata.labels`. Updated all affected examples.
- The hourly example labeled backups as `type: incremental`, but Velero scheduled backups are not generally incremental backups. Updated the label to `type: frequent`.
- The `orderedResources` example used invalid placeholder values such as `namespaces/production` and an empty persistent volume list. Replaced them with the documented comma-separated object-name format and clarified that ordering applies within each listed resource kind.
- The schedule monitoring commands selected backups with `schedule=daily-backup`, but Velero labels scheduled backups with `velero.io/schedule-name=<schedule>`. Updated both selector commands.
- The missed-backup Prometheus alerts did not fire when `velero_backup_last_successful_timestamp` was absent. Added `absent(...)` handling.
- The backup-size alert used `velero_backup_total_items`, which is not the current Velero metric name. Replaced it with `velero_backup_items_total`.
- The Go rotation example did not compile because it imported unused packages and omitted `sort`. It also deleted Backup CRs directly, which Velero documents as leaving object/block storage data behind. Updated the example to select backups using `velero.io/schedule-name` and create `DeleteBackupRequest` resources instead.

## Review Notes
- The post is technically relevant and contains implementation details, so it was reviewed as a code tutorial.
- The examples still assume the reader has a working Velero installation, credentials, snapshot provider support, and Prometheus Operator CRDs where applicable.
