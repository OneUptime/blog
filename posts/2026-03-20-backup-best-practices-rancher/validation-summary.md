# Validation Summary: How to Implement Backup Best Practices in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- Kubernetes
- Velero
- PostgreSQL
- Amazon S3

## Sources Consulted
- Rancher backup and restore overview: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery
- Rancher backup configuration reference: https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/backup-configuration
- Rancher restore configuration reference: https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/restore-configuration
- Rancher backup and restore examples: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/backup-restore-configuration/examples
- Rancher migration workflow: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/migrate-rancher-to-new-cluster
- RKE2 backup and restore: https://docs.rke2.io/datastore/backup_restore
- RKE2 server configuration reference: https://docs.rke2.io/reference/server_config
- Velero customize installation: https://velero.io/docs/main/customize-installation/
- Velero file system backup: https://velero.io/docs/main/file-system-backup/
- Velero backup reference: https://velero.io/docs/v1.17/backup-reference/
- Velero resource filtering: https://velero.io/docs/main/resource-filtering/
- Velero AWS plugin compatibility and install guidance: https://github.com/vmware-tanzu/velero-plugin-for-aws
- Velero AWS plugin releases: https://github.com/vmware-tanzu/velero-plugin-for-aws/releases
- Kubernetes CronJob docs: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes init containers: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes volumes and emptyDir: https://kubernetes.io/docs/concepts/storage/volumes/
- PostgreSQL `pg_dump`: https://www.postgresql.org/docs/17/app-pgdump.html
- AWS CLI S3 copy from stdin/file: https://docs.aws.amazon.com/cli/latest/userguide/cli-services-s3-commands.html

## Issues Found
- The Rancher backup install example was incomplete and used an incorrect `BackupStorageLocation` custom resource shape. I fixed it to use the documented Helm installation flow, created the S3 credential and encryption secrets, and changed the `Backup` resource to the documented `storageLocation.s3` format with `resourceSetName`.
- The etcd layer table incorrectly implied Velero backs up etcd, and the restore note incorrectly redirected HA restores to Rancher restore. I corrected the table to use RKE2 built-in snapshots, added the required RKE2 server token backup note, added S3 retention, and replaced the restore guidance with the documented RKE2 service stop/reset/start flow plus the HA rejoin note.
- The Velero install command pinned an outdated AWS plugin and did not enable the current node-agent based PVC backup path. I updated it to a current AWS plugin release line and enabled `--use-node-agent` with `--default-volumes-to-fs-backup`.
- The PostgreSQL CronJob would not work as written because the `postgres:15` image does not provide the AWS CLI, and the example omitted required environment variables. I rewrote it to use an init container for `pg_dump`, an `amazon/aws-cli` upload container, a shared `emptyDir`, and explicit secret-backed environment variables.
- The Rancher restore example did not match the encrypted backup example and used the wrong storage location structure. I updated it to restore an encrypted backup file with `encryptionConfigSecretName`, `prune: false`, and the documented `storageLocation.s3` fields, and clarified the downstream reconnect behavior.

## Review Notes
- `etcd-s3-retention` is version-gated in RKE2 and requires a release new enough to support that flag.
- Velero AWS plugin versions should be matched to the Velero CLI/server version in use.
