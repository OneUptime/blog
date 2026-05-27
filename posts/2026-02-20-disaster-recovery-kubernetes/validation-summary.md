# Validation Summary: How to Plan Disaster Recovery for Kubernetes Applications

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Velero
- etcd and etcdctl
- AWS S3
- AWS Route 53
- CloudNativePG
- PostgreSQL replication and WAL archiving
- OpenTelemetry
- OneUptime

## Sources Consulted
- Velero install CLI documentation: https://velero.io/docs/v1.13/velero-install/
- Velero Schedule API documentation: https://velero.io/docs/v1.17/api-types/schedule/
- Velero Restore API documentation: https://velero.io/docs/v1.17/api-types/restore/
- Velero backup reference: https://velero.io/docs/v1.14/backup-reference/
- Velero disaster recovery documentation: https://velero.io/docs/main/disaster-case/
- Velero AWS plugin releases: https://github.com/vmware-tanzu/velero-plugin-for-aws/releases
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- Kubernetes CronJob concepts: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- AWS CLI Route 53 change-resource-record-sets reference: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- CloudNativePG replica cluster documentation: https://cloudnative-pg.io/docs/1.27/replica_cluster/
- CloudNativePG Barman object store backup documentation: https://cloudnative-pg.io/docs/1.27/appendixes/backup_barmanobjectstore/
- CloudNativePG Barman Cloud Plugin documentation: https://cloudnative-pg.io/plugin-barman-cloud/docs/intro/

## Issues Found
- The Velero AWS plugin image was pinned to `v1.9.0`, which is outdated for current Velero deployments. Updated it to `v1.13.1`, the current AWS plugin release found during review.
- The etcd CronJob used `bitnami/etcd:3.5`, but the backup script also calls `aws s3 cp`. Updated the manifest comment and image placeholder to require an image containing both `etcdctl` and the AWS CLI.
- The CloudNativePG replication example mixed primary backup configuration and secondary replica configuration into one `Cluster` resource and omitted the `bootstrap.recovery.source` field required for an object-store-backed replica cluster. Split the snippet into primary and secondary `Cluster` resources and added the recovery bootstrap stanza.
- The CloudNativePG WAL comment said WAL files were archived every 5 minutes next to `maxParallel`, but `maxParallel` controls parallel WAL upload, not archive timing. Updated the comment to match the field behavior.
- The failover script referenced `HOSTED_ZONE_ID` without defining it. Added a placeholder hosted zone ID variable.
- The failover script checked `$?` after a `kubectl` command while `set -e` was active, which would cause the script to exit before reaching the conditional. Rewrote the check as `if ! kubectl ...; then`.
- The failover script used `velero restore wait`, which is not the documented restore waiting pattern. Changed the restore command to use `--wait`.

## Review Notes
- CloudNativePG native `barmanObjectStore` support remains functional, but CloudNativePG 1.26 and later deprecate it in favor of the Barman Cloud Plugin. A future update should migrate the example to the plugin-based API.
- The etcd CronJob example assumes self-managed Kubernetes control plane access to etcd certificates and the local etcd endpoint. Managed Kubernetes services usually do not expose etcd this way.
