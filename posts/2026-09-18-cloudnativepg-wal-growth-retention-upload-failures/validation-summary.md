# Validation Summary: Fix CloudNativePG WAL Growth: Retention, Upload Failures, and Orphaned Backups

## Status

validated

## Post Type

Technical troubleshooting guide with Kubernetes commands, PostgreSQL diagnostic queries, and a YAML configuration fragment.

## Technologies Covered

- CloudNativePG 1.30 and its kubectl plugin
- Barman Cloud CNPG-I plugin, ObjectStore resources, and backup retention
- PostgreSQL WAL archiving, replication slots, and point-in-time recovery
- Kubernetes PVCs, custom resources, and container logs
- Amazon S3 versioning, lifecycle rules, multipart uploads, and Object Lock

## Sources Consulted

- CloudNativePG 1.30 release announcement: https://cloudnative-pg.io/releases/cloudnative-pg-1-30.0-released/
- CloudNativePG 1.30 kubectl plugin documentation source: https://github.com/cloudnative-pg/cloudnative-pg/blob/release-1.30/docs/src/kubectl-plugin.md
- CloudNativePG 1.30 storage documentation source: https://github.com/cloudnative-pg/cloudnative-pg/blob/release-1.30/docs/src/storage.md
- CloudNativePG 1.30 labels documentation source: https://github.com/cloudnative-pg/cloudnative-pg/blob/release-1.30/docs/src/labels_annotations.md
- Barman Cloud plugin usage and sidecar configuration: https://cloudnative-pg.io/plugin-barman-cloud/docs/usage/
- Barman Cloud plugin retention policies: https://cloudnative-pg.io/plugin-barman-cloud/docs/retention/
- Barman Cloud plugin troubleshooting: https://cloudnative-pg.io/plugin-barman-cloud/docs/troubleshooting/
- Barman cloud backup deletion and associated WAL cleanup: https://docs.pgbarman.org/release/3.15.0/user_guide/barman_cloud.html
- PostgreSQL archiver statistics: https://www.postgresql.org/docs/current/monitoring-stats.html#PG-STAT-ARCHIVER-VIEW
- PostgreSQL replication slots: https://www.postgresql.org/docs/current/view-pg-replication-slots.html
- PostgreSQL administration functions: https://www.postgresql.org/docs/current/functions-admin.html
- PostgreSQL continuous archiving and recovery: https://www.postgresql.org/docs/current/continuous-archiving.html
- PostgreSQL WAL settings: https://www.postgresql.org/docs/current/runtime-config-wal.html
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- AWS S3 delete markers (original citation): https://docs.aws.amazon.com/AmazonS3/latest/userguide/ManagingDelMarkers.html
- AWS S3 lifecycle configuration elements (replacement citation): https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html
- AWS S3 Object Lock: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html

## Issues Found

- The S3 paragraph attributed guidance about current objects, noncurrent versions, incomplete multipart uploads, and delete markers to a page focused on managing delete markers. Replaced that URL with AWS's lifecycle configuration elements reference, which covers version expiration, multipart-upload cleanup, and expired delete markers. The technical advice and surrounding wording remain unchanged.

## Review Notes

- Confirmed the CloudNativePG 1.30 release exists. The plugin documentation consulted identifies itself as version 0.15.0; the operator and plugin have separate version numbers. The post appropriately directs readers to their installed plugin release for sidecar settings.
- Verified the status command, cluster PVC label, singular ObjectStore lookup, comma-separated fully qualified backup resource queries, namespace and YAML output flags, and container log command including --since=30m. Commands assume the named resources, CRDs, kubectl plugin, and access permissions exist. The example pod must be replaced with the current primary as stated.
- The PVC listing identifies provisioned volumes and their capacity; it is not a measurement of filesystem bytes used. Actual usage and bucket metrics must be gathered separately, as the guide requests.
- Both SQL queries use documented columns and compatible function signatures. The LSN difference is a diagnostic estimate of the WAL span from restart_lsn, not an exact filesystem usage measurement. Slot spans can overlap, and a lost slot may no longer protect its required WAL. The primary-only and null-value caveats are appropriate.
- Archiver counters are cumulative and must be interpreted with their reset time. Failed archiving can retain local WAL, and max_wal_size is not a hard storage limit. Slot removal is independent of repairing upload failures.
- Confirmed ObjectStore.spec.retentionPolicy accepts the shown 30d recovery window. It must be merged into the existing resource. The plugin documents instanceSidecarConfiguration.retentionPolicyIntervalSeconds, so cleanup should not be assumed immediate.
- Recovery-window retention can preserve a backup older than the window boundary and its required WAL. Missing newer backups can prevent this chain from advancing. Barman's catalog-aware deletion removes backups and associated unused WAL, supporting the warning against arbitrary lifecycle expiration of live archive objects.
- S3 logical deletion can retain older object versions. Multipart upload cleanup uses a separate lifecycle action. Object Lock and legal holds can prevent permanent deletion; a successful logical deletion does not necessarily reclaim protected version storage.
- The recommendations to inventory retired archive prefixes and test isolated restores are sound. Recovery depends on a usable base backup and a continuous required WAL chain, not merely successful object deletion or a configured retention interval.
- Review was based on official documentation and static inspection. No live Kubernetes cluster, PostgreSQL server, or object store was used, and no upload, retention, or restore exercise was executed. Some rendered CloudNativePG 1.30 documentation URLs were unavailable through the web tool; the corresponding official release-1.30 documentation source files were checked instead.
