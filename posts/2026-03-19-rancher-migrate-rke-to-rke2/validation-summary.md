# Validation Summary: How to Migrate Rancher from RKE to RKE2

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE (RKE1)
- RKE2
- Kubernetes
- Helm
- cert-manager
- Rancher Backups / backup-restore-operator
- etcd
- Amazon S3 / S3-compatible object storage

## Sources Consulted
- Rancher Docs: Migrating Rancher to a New Cluster - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/migrate-rancher-to-new-cluster
- Rancher Docs: Backup Restore Usage Guide - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/back-up-restore-usage-guide
- Rancher Docs: Backup Configuration - https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/backup-configuration
- Rancher Docs: Install/Upgrade Rancher on a Kubernetes Cluster - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher Docs: Helm Chart Options - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher Docs: RKE Cluster Configuration Reference - https://ranchermanager.docs.rancher.com/v2.14/reference-guides/cluster-configuration/rancher-server-configuration/rke1-cluster-configuration
- RKE2 Docs: High Availability - https://docs.rke2.io/install/ha
- RKE2 Docs: Installation Methods - https://docs.rke2.io/install/methods
- RKE1 Docs: One-time Snapshots - https://rke.docs.rancher.com/etcd-snapshots/one-time-snapshots
- RKE1 Docs: Adding and Removing Nodes - https://rke.docs.rancher.com/managing-clusters
- cert-manager Docs: Helm Installation - https://cert-manager.io/docs/installation/helm/

## Issues Found
- The original guide installed Rancher on the target RKE2 cluster before restoring the backup. Rancher’s current migration docs explicitly say not to preinstall Rancher on the destination cluster for a migration, so the flow was corrected to install the backup operator first, restore, then install cert-manager and Rancher.
- The restore manifest omitted `prune: false`. Rancher’s migration docs require `prune: false` during migrations to a different cluster, so that field was added.
- The post was missing the documented cross-distribution migration fix for the restored `local` cluster object. A new step was added to edit `clusters.management.cattle.io/local` after restore and before reinstalling Rancher.
- The backup operator install commands did not pin a chart version. Rancher requires selecting a `rancher-backup` chart version compatible with the Rancher release, so `CHART_VERSION` placeholders and `--version` flags were added on both source and target clusters.
- The backup example used the legacy `rancher-resource-set`. Current Rancher backup docs use `rancher-resource-set-full` for backups that need Rancher secrets restored during migration, so the manifest was updated accordingly.
- The additional RKE2 server join example pointed at the first server node instead of a fixed registration address. RKE2 HA docs recommend a stable registration endpoint or load balancer, so the join config now uses the load balancer address and documents required ports.
- The target-cluster cert-manager install used a hard-coded version with no compatibility guidance. It was changed to a version placeholder tied to the Rancher release being migrated.
- The Rancher reinstall command on the target cluster used generic new-install values before restore, including a bootstrap password. It was updated to reuse the exported Helm values and reinstall the same Rancher version after restore.
- The original cutover/decommission flow did not scale down the old Rancher instance after DNS cutover. Rancher’s migration docs warn that leaving the old server up can keep agents attached to the original server URL, so a scale-down step was added before final decommissioning.
- The post advised keeping backups after running `rke remove` without noting that `rke remove` deletes local snapshots and can remove RKE-managed S3 snapshots. The decommission step now warns readers to copy required etcd snapshots off-cluster first.
- The Rancher version check used a namespaced `kubectl get settings` example. It was updated to a cluster-scoped `settings.management.cattle.io` query.

## Review Notes
- The guide now intentionally uses placeholders for `rancher-backup` and `cert-manager` versions because compatibility depends on the Rancher version being migrated.
- RKE1 reached end of life on July 31, 2025, and Rancher documentation recommends replatforming to RKE2. That makes the topic still relevant, but the version-selection steps matter more than they did when older examples were written.
- The post remains a valid migration guide after the corrections, but readers still need to confirm their Rancher-to-Kubernetes support matrix before choosing the target RKE2 Kubernetes version.
