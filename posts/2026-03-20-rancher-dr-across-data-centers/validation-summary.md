# Validation Summary: How to Set Up Rancher DR Across Data Centers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Rancher Backup / Restore Operator
- Kubernetes
- RKE2
- Helm
- cert-manager
- Amazon S3-compatible object storage
- Amazon Route 53
- AWS CLI

## Sources Consulted
- Rancher migration guide: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/migrate-rancher-to-new-cluster
- Rancher backup configuration reference: https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/backup-configuration
- Rancher restore configuration reference: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/backup-restore-configuration/restore-configuration
- Rancher backup and restore examples: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/backup-restore-configuration/examples
- Official `Backup` CRD definition: https://raw.githubusercontent.com/rancher/backup-restore-operator/main/charts/rancher-backup-crd/templates/backup.yaml
- Official `Restore` CRD definition: https://raw.githubusercontent.com/rancher/backup-restore-operator/main/charts/rancher-backup-crd/templates/restore.yaml
- Official `rancher/backup-restore-operator` README: https://github.com/rancher/backup-restore-operator
- RKE2 quick start: https://docs.rke2.io/install/quickstart
- RKE2 cluster access: https://docs.rke2.io/cluster_access
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/
- AWS CLI `change-resource-record-sets`: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- Rancher support matrix: https://www.suse.com/suse-rancher/support-matrix/all-supported-versions/

## Issues Found
- The architecture and introduction described a replicated standby Rancher instance. Rancher documents backup-and-restore migration to a new cluster instead. I corrected the architecture and wording to a restore-based DR flow.
- The backup operator installation was outdated and incomplete. Current Rancher guidance requires installing `rancher-backup-crd` before `rancher-backup` and selecting a chart version compatible with the Rancher release. I replaced the hardcoded `4.0.0` with a `CHART_VERSION` placeholder and the documented install sequence.
- The `Backup` manifest was technically wrong. `Backup` is cluster-scoped, `resourceSetName` is required by the CRD, and Rancher examples use the regional S3 endpoint. I removed `metadata.namespace`, added `resourceSetName: rancher-resource-set-full`, and changed the endpoint to `s3.us-west-2.amazonaws.com`.
- The secondary-site procedure installed cert-manager and Rancher before the restore. Rancher’s migration guide says not to install Rancher on the new cluster first because it can cause problems. I changed Step 3 to install only the backup operator and restore prerequisites on the DR cluster.
- The RKE2 commands pinned an old release and assumed `kubectl` was already on `PATH`. I changed the version to a supported-version placeholder, added `sudo`, and added the documented `KUBECONFIG` and `/var/lib/rancher/rke2/bin` setup.
- The cert-manager command used the older `installCRDs=true` setting. I updated it to the current `crds.enabled=true` syntax and moved cert-manager installation to the post-restore stage where Rancher documents it.
- The Route 53 section mixed automatic health-check failover with a manual restore workflow, and its change batch was incomplete for Route 53 failover records. I replaced it with a low-TTL DNS cutover pattern that matches Rancher’s documented “restore first, then redirect traffic” flow.
- The monitoring CronJob claimed to verify backup freshness but only printed the latest timestamp. I updated it to query S3, fail when no backup exists, and exit non-zero when the newest backup is older than two hours.
- The `Restore` manifest was wrong for a DR cluster. `Restore` is cluster-scoped, migration restore requires `prune: false`, the S3 secret namespace was missing, and `backupFilename` must not duplicate the configured base folder. I corrected those fields and updated the S3 lookup to strip the `rancher-backups/` prefix before writing the restore resource.
- The failover procedure omitted Rancher reinstallation requirements after restore. I added the documented post-restore step to install cert-manager and Rancher with the same chart repo, version, values, and hostname as the primary site, plus the cross-distribution caveat for the `local` cluster object.

## Review Notes
- The post is now technically valid for a pilot-light, restore-based Rancher DR pattern. It is not a hot-standby or continuously synchronized Rancher setup.
- Exact `rancher-backup`, cert-manager, Rancher, Helm, and RKE2 versions remain environment-specific. Operators still need to select versions compatible with the original Rancher installation and support matrix.
- If encrypted Rancher backups are used, the saved `encryption-provider-config.yaml` must be recreated as a Secret on the DR cluster before restore.
- Rancher backups restore Rancher management-plane state. External side effects, such as previously provisioned downstream infrastructure, still need validation after failover.
