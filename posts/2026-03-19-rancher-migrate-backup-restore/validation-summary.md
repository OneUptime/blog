# Validation Summary: How to Migrate Rancher Using Backup and Restore

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher Backup Operator (`rancher-backup`)
- Kubernetes
- Helm
- cert-manager
- Amazon S3 / S3-compatible object storage
- DNS

## Sources Consulted
- Rancher: Migrating Rancher to a New Cluster - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/migrate-rancher-to-new-cluster
- Rancher: Backing up Rancher - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/back-up-rancher
- Rancher: Restoring Rancher - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/restore-rancher
- Rancher: Backup Configuration - https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/backup-configuration
- Rancher: Install/Upgrade Rancher on a Kubernetes Cluster - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher: Choosing a Rancher Version - https://ranchermanager.docs.rancher.com/v2.14/getting-started/installation-and-upgrade/resources/choose-a-rancher-version
- cert-manager: Install with kubectl / installation guidance - https://cert-manager.io/docs/installation/kubectl/
- Rancher: Upgrading Cert-Manager - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/resources/upgrade-cert-manager

## Issues Found
- The original post installed Rancher on the target cluster before running the restore. Rancher’s migration guide explicitly says not to install Rancher first on a new target cluster, so the sequence was corrected to install `rancher-backup`, restore, then bring Rancher up.
- The backup example used `resourceSetName: rancher-resource-set`. Current Rancher backup docs use `rancher-resource-set-full` or `rancher-resource-set-basic`; for migration, `rancher-resource-set-full` is the appropriate choice because it includes Rancher secrets.
- The backup operator installation commands were incomplete. The post referenced `rancher-charts/...` charts without first adding the Rancher charts repository or selecting a compatible chart version, so those steps were added.
- The restore manifest omitted `prune: false`, which Rancher requires for migration restores. That field was added.
- The encrypted-backup guidance was inconsistent: the secret name in the example did not match the name expected by the restore, and the restore spec did not mention `encryptionConfigSecretName`. The secret example was corrected and the restore requirement was documented.
- The example Rancher install used `--version=2.8.x`, which is not a valid exact Helm chart version. It was replaced with an exact-version placeholder (`x.y.z`) and updated to stress reusing the original hostname.
- The cert-manager example used an old pinned static manifest and described cert-manager as universally required. It was updated to the current Rancher install flow and clarified that cert-manager is needed when using Rancher-generated certificates or Let’s Encrypt.
- The downstream reconnect section suggested re-importing clusters as the primary recovery path. Rancher’s migration docs instead emphasize reusing the same hostname, redirecting traffic, and scaling down the old Rancher server; the section was updated accordingly.
- The draft omitted the documented local-cluster object adjustment needed when migrating between different Kubernetes distributions, such as K3s to RKE2. That caveat was added.

## Review Notes
- Cert-manager compatibility remains Rancher-version-sensitive. The post now tells readers to use a cert-manager version supported by their Rancher version rather than hard-coding a stale release.
- Rancher chart repository choice can vary between `rancher-latest` and `rancher-stable` depending on the source version being reinstalled. The key technical requirement is that the installed Rancher chart version exactly matches the source Rancher version.
