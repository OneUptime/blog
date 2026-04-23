# Validation Summary: How to Recover Rancher After Complete Server Failure

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Rancher Backup / Restore Operator
- RKE2
- Kubernetes
- Helm
- cert-manager
- Amazon S3-compatible object storage

## Sources Consulted
- Rancher migration guide: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/migrate-rancher-to-new-cluster
- Rancher restore guide: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/restore-rancher
- Rancher backup usage guide: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/back-up-restore-usage-guide
- Rancher backup configuration reference: https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/backup-configuration
- Rancher restore configuration reference: https://ranchermanager.docs.rancher.com/v2.9/reference-guides/backup-restore-configuration/restore-configuration
- Rancher Helm chart version guidance: https://ranchermanager.docs.rancher.com/v2.14/getting-started/installation-and-upgrade/resources/choose-a-rancher-version
- Rancher Helm chart options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- RKE2 quick start: https://docs.rke2.io/install/quickstart
- RKE2 installation script configuration: https://docs.rke2.io/install/configuration
- RKE2 CLI tools reference: https://docs.rke2.io/reference/cli_tools
- RKE2 server configuration reference: https://docs.rke2.io/reference/server_config
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/
- Helm installation docs: https://helm.sh/docs/intro/install/

## Issues Found
- The recovery flow was ordered incorrectly for a fresh replacement cluster. The original post installed cert-manager and Rancher before performing the restore. Rancher’s migration documentation requires installing the backup operator first, restoring from backup, and only then installing cert-manager and Rancher. The step order and commands were corrected.
- The backup operator install instructions were outdated. Current Rancher documentation requires installing both `rancher-backup-crd` and `rancher-backup`, and choosing a chart version compatible with the Rancher version being restored. The post’s hardcoded `image.tag=v4.0.0` was removed and replaced with chart-version-based installation.
- The RKE2 install example assumed root privileges and assumed `kubectl` was already on `PATH`. Official RKE2 docs state the install must run as root or through `sudo`, and that `kubectl` is placed in `/var/lib/rancher/rke2/bin` but is not on `PATH` by default. The commands were updated accordingly.
- The post hardcoded an old RKE2 release. Because Rancher restores must match a supported Kubernetes version for the Rancher release in backup, the RKE2 version was changed to a placeholder for a supported version rather than leaving a stale pinned version.
- The Helm install step pulled the latest Helm implicitly. Rancher’s migration documentation says to use the same Helm version that was used on the original installation. The post now installs a specific Helm version placeholder instead of implicitly taking latest.
- The cert-manager installation used the older `installCRDs=true` syntax and a stale pinned version. The post now uses the current Helm value `crds.enabled=true` and a supported-version placeholder.
- The encryption restore secret was incorrect. Rancher requires the saved Kubernetes `EncryptionConfiguration` file to be recreated as a secret using `--from-file`, with the key name `encryption-provider-config.yaml`. The original JSON literal secret would not work for Rancher restore, so it was replaced.
- The restore manifest used `prune: true`. For restoring Rancher onto a new replacement cluster, Rancher’s migration guide requires `prune: false`. This was corrected.
- The restore manifest incorrectly included the S3 folder path in `backupFilename` while also setting `storageLocation.s3.folder`. Rancher’s restore configuration docs specify that the backup filename should be the exact filename relative to the configured base folder. The duplicated folder prefix was removed.
- The Rancher reinstall step did not pin the original Rancher version and used ad hoc install values like `bootstrapPassword` and Let's Encrypt settings instead of the original Helm values. The post was corrected to reinstall Rancher with the same chart repo, Rancher version, and saved `rancher-values.yaml` from the original installation.
- The verification section used a plain TLS-validating `curl` command, which can fail when a restored Rancher deployment is using self-signed or privately trusted certificates. The health check was adjusted to make the availability check reliable across common restore scenarios.
- The provisioning step implied Ubuntu and RHEL were interchangeable while only providing `apt` commands. A note was added to clarify that the example commands are for Ubuntu and that RHEL requires equivalent `dnf` commands.

## Review Notes
- The guide is now technically sound for the common “restore Rancher onto a fresh replacement cluster” path, assuming the operator chart version, Rancher version, cert-manager version, Helm version, and Kubernetes version are chosen to match the original installation and Rancher support matrix.
- Rancher documents an additional step when migrating between different Kubernetes distributions for the local cluster, such as K3s to RKE2 or RKE2 to K3s. This post does not cover that edge case explicitly because it assumes rebuilding on RKE2; that caveat may be worth adding in a future revision if the post is broadened.
