# Validation Summary: How to Plan Disaster Recovery for Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher CLI
- Rancher Backup and Restore Operator
- Kubernetes
- Prometheus Operator / PrometheusRule
- etcd snapshots

## Sources Consulted
- Rancher Backup Restore Usage Guide: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/back-up-restore-usage-guide
- Rancher Backup Configuration: https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/backup-configuration
- Rancher Backup and Restore Examples: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/backup-restore-configuration/examples
- Backing up a Cluster: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/back-up-rancher-launched-kubernetes-clusters
- Restoring Rancher: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/restore-rancher
- Migrating Rancher to a New Cluster: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/migrate-rancher-to-new-cluster
- Rancher CLI source (`cmd/cluster.go`): https://github.com/rancher/cli/blob/master/cmd/cluster.go
- Rancher Backup and Restore Operator README: https://github.com/rancher/backup-restore-operator
- Rancher Backup operator metrics source: https://github.com/rancher/backup-restore-operator/blob/master/pkg/monitoring/metrics.go
- Rancher Backup chart PrometheusRule template: https://github.com/rancher/backup-restore-operator/blob/master/charts/rancher-backup/templates/prometheus-rules.yaml

## Issues Found
- The original RPO explanation implied Rancher disaster recovery was primarily about backing up `etcd`. I corrected it to distinguish Rancher application backups from `etcd` snapshots for Rancher-launched clusters, which matches Rancher's documented backup model.
- The original Step 2 example used a Kubernetes `CronJob` with the `rancher/backup-restore-operator` image to run `etcdctl snapshot save`. That is not how the Rancher Backup operator works. I replaced it with a valid recurring `Backup` custom resource.
- The inventory example used older/less explicit Rancher CLI command forms and exported generic cluster configs. I updated it to current `rancher clusters` commands and a valid kubeconfig export example verified from the official CLI source.
- The `Backup` custom resource example omitted `resourceSetName`, which Rancher requires, and it lacked explicit S3 credential fields used in the official examples. I added the missing fields and aligned the endpoint format with Rancher's documented S3 examples.
- The Prometheus alert referenced a non-existent metric (`rancher_backup_last_success_timestamp`) and used the wrong namespace for the backup operator. I replaced it with an alert based on the official `rancher_backups_failed_total` metric and the default `cattle-resources-system` namespace.
- The recovery runbook mixed Docker and Kubernetes restore assumptions in a way that was too specific to be generally correct. I rewrote those steps so they remain accurate across Rancher's documented restore and migration flows.

## Review Notes
- Rancher Backups protects Rancher resources on the local cluster only. Downstream cluster `etcd` snapshots, persistent volume data, and application-level recovery still need separate DR procedures.
- Rancher restore and migration procedures are version-sensitive. Restores should use a compatible Rancher version, and migrations to a new cluster should retain the same Rancher hostname.
- Backup operator metrics and default alerting are not enabled automatically; they require enabling the relevant Helm chart values.
