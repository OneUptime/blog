# Validation Summary: How to Automate Backup Schedules in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Backup/Restore Operator
- RKE2
- etcd snapshots
- Velero
- Kubernetes CronJobs
- Prometheus Operator
- PostgreSQL
- Amazon S3

## Sources Consulted
- RKE2 Backup and Restore: https://docs.rke2.io/datastore/backup_restore
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- Rancher Backup Configuration: https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/backup-configuration
- Rancher Backup and Restore Examples: https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/examples
- Rancher Backup/Restore Operator repository: https://github.com/rancher/backup-restore-operator
- Velero Backup Reference: https://velero.io/docs/v1.17/backup-reference/
- Velero Restore Reference: https://velero.io/docs/v1.17/restore-reference/
- Velero Schedule API Type: https://velero.io/docs/v1.17/api-types/schedule/
- Velero Restore API Type: https://velero.io/docs/v1.17/api-types/restore/
- Velero Helm chart values and alert examples: https://github.com/vmware-tanzu/helm-charts/blob/main/charts/velero/values.yaml
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The RKE2 config block incorrectly included `systemctl restart rke2-server` inside YAML. I moved the restart step into its own shell block so the config snippet is valid YAML.
- The RKE2 example set local snapshot retention to 15 but did not set S3 retention, which would leave S3 retention at its default on current RKE2 releases. I added `etcd-s3-retention: 15` so the S3 example matches the stated retention behavior.
- The Rancher management-plane `Backup` manifest incorrectly treated the Rancher `Backup` CR as namespaced. The official CRD is cluster-scoped, so I removed `metadata.namespace` and updated the monitoring commands to use the fully qualified cluster-scoped resource `backups.resources.cattle.io`.
- The Rancher `Backup` manifest omitted the required `resourceSetName`. The official operator requires each `Backup` CR to reference a `ResourceSet`, so I added `resourceSetName: rancher-resource-set-full`.
- The Rancher S3 storage snippet omitted the documented S3 `endpoint`. I added `endpoint: s3.us-east-1.amazonaws.com` to match the official examples.
- The Velero “last backup status” example used an unreliable selector pattern for scheduled backups. I replaced it with a `kubectl get backups.velero.io` query that filters on the documented schedule-generated backup name prefix.
- The PostgreSQL CronJob used `postgres:15-alpine` but called `aws s3 cp` even though that image does not include the AWS CLI by default. I added `apk add --no-cache aws-cli` before the backup command and set `AWS_DEFAULT_REGION`. I also verified locally that `pg_dump` is present and `aws` becomes available after installing `aws-cli` in that image.
- The Prometheus alert expressions did not match the current official Velero chart guidance. I replaced them with the chart’s `velero_backup_last_status` and `velero_backup_last_successful_timestamp` patterns, including the `absent()` case for missed scheduled backups.
- The restore-test CronJob selected the newest Velero backup regardless of phase, which could pick a failed backup. I updated it to select the most recent completed `production-daily` backup and fail fast if none exists.
- The restore-test CronJob pod template omitted `restartPolicy`, which is required for Job/CronJob pods. I added `restartPolicy: OnFailure`.

## Review Notes
- The restore-test image is still a placeholder custom image. For the example to work in practice, that image must contain at least `velero`, `kubectl`, and `jq`.
- `etcd-s3-retention` is a relatively recent RKE2 capability. The post now matches current documentation, but very old RKE2 releases may not support that field.
- `kubectl` is not installed in this workspace, so I could not run a local `kubectl --dry-run=client` validation of the Kubernetes manifests here.
