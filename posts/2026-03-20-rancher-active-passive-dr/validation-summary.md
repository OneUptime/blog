# Validation Summary: How to Configure Rancher Active-Passive DR

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher Backup/Restore Operator
- RKE2
- Kubernetes
- Helm
- Amazon S3
- Amazon Route 53
- Bash

## Sources Consulted
- Rancher: Backup, Restore, and Disaster Recovery: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery
- Rancher: Backing up Rancher: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/back-up-rancher
- Rancher: Backup Configuration: https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/backup-configuration
- Rancher: Restore Configuration: https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/restore-configuration
- Rancher: Restoring Rancher: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/restore-rancher
- Rancher: Migrating Rancher to a New Cluster: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/migrate-rancher-to-new-cluster
- Rancher: Rancher Helm Chart Options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher: Install/Upgrade Rancher on a Kubernetes Cluster: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- RKE2 Quick Start: https://docs.rke2.io/install/quickstart
- Kubernetes: Encrypting Confidential Data at Rest: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- Kubernetes: kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Kubernetes: kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- AWS CLI: Route 53 `change-resource-record-sets` reference: https://docs.aws.amazon.com/goto/aws-cli/route53-2013-04-01/ChangeResourceRecordSets
- Rancher backup-restore-operator repository: https://github.com/rancher/backup-restore-operator

## Issues Found
- The post described the passive side as a continuously synchronized Rancher instance with shared storage or replication. Rancher’s documented DR flow is backup-and-restore based, so the introduction and architecture were corrected to describe a prepared passive cluster backed by recurring Rancher backups.
- The prerequisites omitted several requirements needed for the documented workflow to work: the Rancher Backup operator on the primary cluster, matching Kubernetes distribution/version planning, retained Rancher Helm values and chart versions, and the shared encryption configuration file. These were added.
- The `Backup` manifest incorrectly set `metadata.namespace`, even though Rancher `Backup` and `Restore` are cluster-scoped custom resources. The namespace was removed from the CR manifests.
- The backup example omitted `resourceSetName: rancher-resource-set-full`, which Rancher documents as the resource set that includes essential secrets needed for restore and migration. That field was added.
- The encryption secret example was incorrect. Rancher expects a secret containing the Kubernetes `EncryptionConfiguration` file under the `encryption-provider-config.yaml` key, not a JSON literal with a placeholder string. The example was replaced with a file-based secret creation flow and a note to preserve the file for restore.
- The passive-cluster setup installed only the `rancher-backup` chart. Current Rancher guidance installs `rancher-backup-crd` first and then `rancher-backup`, with a chart version compatible with the protected Rancher version. The setup example was corrected accordingly.
- The RKE2 setup script used `kubectl` immediately after installation without accounting for the fact that RKE2 installs `kubectl` under `/var/lib/rancher/rke2/bin` and does not add it to `PATH` by default. The script now exports the documented RKE2 binary path and kubeconfig.
- The monitoring script claimed to run as a cron job even though it was an infinite loop, and it checked `/v3/ping`. Rancher documents `/healthz` as the health check endpoint, so the script was aligned to a long-running service model and updated to probe `/healthz`.
- The failover script derived `backupFilename` from the full S3 key even though Rancher documents that, when a base folder is configured, `backupFilename` should be just the file name within that folder. The script now strips the folder prefix with `basename`.
- The restore manifest in the failover script omitted required or effectively required fields from the documented S3 restore flow, including the S3 endpoint, `credentialSecretNamespace`, and `encryptionConfigSecretName` for encrypted backups. These were added.
- The original failover flow stopped after creating the `Restore` resource and sending a notification. Rancher’s documented migration flow requires continuing with cert-manager installation when needed and then reinstalling Rancher with the same hostname and compatible chart values after the restore completes. The failover script was extended to reflect that.
- The DNS example updated the hostname to a passive node IP, which is a poor fit for the HA Rancher pattern described elsewhere in Rancher documentation. The example was corrected to target the passive load balancer endpoint and now warns that the original Rancher instance must be fenced off so only one environment serves the server URL.
- The readiness-check script tried to inspect passive Rancher and cert-manager workloads even though the corrected DR flow prepares the passive cluster for restore rather than keeping Rancher already installed there. The checks were updated to validate backup access, the backup operator, and the required secrets instead.

## Review Notes
- The corrected guide now matches Rancher’s documented restore-based DR and migration workflow rather than implying live replication between active and passive environments.
- Rancher documents extra post-restore edits when migrating between different Kubernetes distributions. The post now avoids that unsupported shortcut by requiring the passive cluster to use the same supported distribution as the primary.
- If you use an AWS load balancer behind Route 53, an alias record may be preferable to a raw `A` record depending on how your load balancer is exposed.
