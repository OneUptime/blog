# Validation Summary: How to Migrate Rancher to a New Cluster

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- Rancher Backup and Restore operator
- cert-manager
- RKE2
- S3-compatible object storage
- DNS

## Sources Consulted
- Rancher: Migrating Rancher to a New Cluster - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/migrate-rancher-to-new-cluster
- Rancher: Backup Configuration - https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/backup-configuration
- Rancher: Restore Configuration - https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/restore-configuration
- Rancher: Install/Upgrade Rancher on a Kubernetes Cluster - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher: Rancher Helm Chart Options - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher: Backup Restore Usage Guide - https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/back-up-restore-usage-guide
- RKE2: Quick Start - https://docs.rke2.io/install/quickstart
- RKE2: Configuration Options - https://docs.rke2.io/install/configuration
- cert-manager: Installing with Helm - https://cert-manager.io/docs/installation/helm/

## Issues Found
- The post installed Rancher on the target cluster before restoring the backup. I changed the order so the restore happens on a clean target cluster first, then cert-manager and Rancher are installed after the restore, because Rancher's migration guide warns that preinstalling Rancher on the target can cause problems.
- The backup operator install commands did not pin a chart version. I added `CHART_VERSION` and `--version` to the source and target install steps because Rancher requires a `rancher-backup` chart version compatible with the Rancher version.
- The backup example used `resourceSetName: rancher-resource-set`. I changed it to `rancher-resource-set-full`, which Rancher documents as the maintained ResourceSet that includes the essential secrets needed for restore and migration.
- The restore example omitted `prune: false`. I added it because Rancher requires `prune: false` when restoring during a migration to a different cluster.
- The restore example implied a guessed backup filename and then restarted Rancher immediately after restore. I changed it to use the exact backup filename from storage and replaced the restart step with the documented post-restore flow.
- The post omitted the documented local cluster object edits required when migrating between Kubernetes distributions. I added that conditional step before reinstalling Rancher.
- The post hardcoded cert-manager `v1.14.4`. I replaced it with a supported-version placeholder because the correct cert-manager version depends on the Rancher version and current support guidance.
- The guide did not state that the Rancher hostname must remain the same, and its troubleshooting advice implied the domain could simply be changed. I corrected the prerequisites, DNS step, and troubleshooting notes to reflect Rancher's same-hostname requirement.
- The guide kept the original Rancher server running until final decommission. I added the documented step to scale the original Rancher deployment to zero after DNS cutover so agents stop talking to the old server.

## Review Notes
- Rancher backup/restore migration is sensitive to version alignment. The Rancher version must match exactly, and the backup chart and cert-manager versions should be selected for compatibility with that Rancher release.
- Rancher documents that migrating while also changing Kubernetes versions can lead to unsupported behavior because restored resources may not match the target cluster's available APIs.
- The RKE2 snippet is technically valid as an example, but a full HA RKE2 rollout still requires the normal server/agent join configuration for additional nodes.
