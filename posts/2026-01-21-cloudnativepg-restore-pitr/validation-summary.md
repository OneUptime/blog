# Validation Summary: How to Restore PostgreSQL from Backup with CloudNativePG

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- CloudNativePG
- Barman Cloud Plugin
- Kubernetes
- PostgreSQL
- S3, Google Cloud Storage, and Azure Blob Storage
- Point-in-time recovery (PITR)

## Sources Consulted
- CloudNativePG 1.29 Recovery documentation: https://cloudnative-pg.io/docs/1.29/recovery/
- CloudNativePG 1.29 API reference: https://cloudnative-pg.io/docs/1.29/cloudnative-pg.v1/
- CloudNativePG 1.29 Bootstrap documentation: https://cloudnative-pg.io/docs/1.29/bootstrap/
- Barman Cloud Plugin documentation: https://cloudnative-pg.io/plugin-barman-cloud/docs/concepts/
- Barman Cloud Plugin object store provider documentation: https://cloudnative-pg.io/plugin-barman-cloud/docs/object_stores/
- Barman Cloud Plugin API reference: https://cloudnative-pg.io/plugin-barman-cloud/docs/plugin-barman-cloud.v1/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- PostgreSQL backup control functions documentation: https://www.postgresql.org/docs/current/functions-admin.html
- Barman barman-cloud-wal-archive manual: https://docs.pgbarman.org/release/3.11.1/barman-cloud-wal-archive.1.html

## Issues Found
- The post used CloudNativePG's native `barmanObjectStore` recovery configuration throughout the object storage examples. Native Barman Cloud object store support is deprecated in current CloudNativePG releases, so the examples were updated to use the Barman Cloud Plugin with `ObjectStore` resources and `externalClusters[].plugin`.
- The S3 example included an unsupported `s3Credentials.region` field. The updated Barman Cloud Plugin `ObjectStore` example removes that field.
- The disaster recovery example configured new backups with the deprecated native `spec.backup.barmanObjectStore` path. It now configures a Barman Cloud Plugin `ObjectStore` and enables WAL archiving through `spec.plugins`.
- Recovery examples using `targetXID`, `targetName`, and `targetImmediate` omitted `backupID`. CloudNativePG requires `backupID` for those targets, so the examples now include it.
- The troubleshooting section used `barman-cloud-wal-archive --list`, but `barman-cloud-wal-archive` is for archiving a WAL file and does not provide a `--list` mode. The command was replaced with an S3 listing of archived WAL files.

## Review Notes
The post is now aligned with current CloudNativePG object-store recovery guidance. The examples still use placeholder backup IDs, bucket names, credentials, and server names that readers must replace with values from their own environment.
