# Validation Summary: How to Set Up Disaster Recovery for Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Rancher Backup / Backup Restore Operator
- Helm
- kubectl
- AWS S3
- Prometheus / PrometheusRule
- cert-manager
- Velero

## Sources Consulted
- Rancher Backup Configuration: https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/backup-configuration
- Rancher Backup and Restore Examples: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/backup-restore-configuration/examples
- Rancher: Migrating Rancher to a New Cluster: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/migrate-rancher-to-new-cluster
- Rancher Backup Restore Usage Guide: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/back-up-restore-usage-guide
- Rancher Backup Restore Operator repository: https://github.com/rancher/backup-restore-operator
- Rancher Backup Restore Operator default Prometheus rules: https://github.com/rancher/backup-restore-operator/blob/release/v8.x/charts/rancher-backup/templates/prometheus-rules.yaml
- AWS CLI `put-bucket-replication` reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-replication.html
- cert-manager installation with `kubectl apply`: https://cert-manager.io/docs/installation/kubectl/
- Rancher etcd backup guidance for Rancher-launched clusters: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/back-up-rancher-launched-kubernetes-clusters

## Issues Found
1. The backup manifests used `rancher-resource-set`, which Rancher deprecated and removed in newer releases. I changed all backup examples to `rancher-resource-set-full`, which is the supported ResourceSet for restore and migration scenarios that need essential secrets.
2. The S3 examples used the generic `s3.amazonaws.com` endpoint. I changed them to the regional endpoint `s3.us-west-2.amazonaws.com` to match Rancher’s documented S3 examples for a `us-west-2` bucket.
3. The DR runbook treated a new-cluster recovery like an in-place restore by installing Rancher before the restore and scaling Rancher down and up manually. Rancher’s migration/DR flow is the opposite: install the backup operator first, restore with `prune: false`, then install cert-manager and Rancher using the original hostname and Rancher version. I corrected both the numbered procedure and the example script.
4. The recovery script was missing the `rancher-charts` repository and a compatible `rancher-backup` chart version, so the backup operator install commands were incomplete. I added the repository setup, a `CHART_VERSION` parameter, and a concrete `Restore` custom resource example.
5. The monitoring rules referenced kube-state-metrics custom-resource condition metrics, but Rancher Backups exposes its own `rancher_backup_*` metrics and ships a default `BackupFailed` alert based on them. I replaced the alert rules so they use the operator’s published metrics and placed the `PrometheusRule` in the operator namespace.
6. The downstream cluster guidance said to enable etcd snapshots on all managed clusters. That is too broad because hosted control planes do not expose etcd in the same way. I narrowed this to self-managed downstream clusters where you control etcd.
7. The S3 replication step omitted a required prerequisite. I added the requirement to enable versioning on both the source and destination buckets before applying replication.

## Review Notes
- Rancher’s documented disaster recovery path for a new cluster requires the same Rancher version and the same server URL hostname as the original environment.
- If the recovery target uses a different Kubernetes distribution than the original local cluster, Rancher’s migration docs require additional edits to the restored `local` cluster object before bringing Rancher up.
- The example script now parameterizes the cert-manager version instead of pinning a stale release; readers should choose a cert-manager version supported by their Rancher release.
- The embedded shell example was syntax-checked with `bash -n`.
