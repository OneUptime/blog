# Validation Summary: How to Plan a Rancher Upgrade Strategy

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Kubernetes
- RKE2
- Helm
- rancher-backup operator
- `kubectl`
- Bash

## Sources Consulted
- Rancher upgrade docs: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster/upgrades
- Rancher rollback docs: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster/rollbacks
- Rancher backup and restore docs: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery
- Rancher health check docs: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- RKE2 backup and restore docs: https://docs.rke2.io/datastore/backup_restore
- Helm rollback docs: https://helm.sh/docs/helm/helm_rollback/
- Rancher generated `Setting` controller showing `settings` is cluster-scoped (`Namespaced: false`): https://github.com/rancher/rancher/blob/main/pkg/generated/norman/management.cattle.io/v3/zz_generated_setting_controller.go
- Rancher generated `Cluster` type showing `Cluster` is cluster-scoped: https://github.com/rancher/rancher/blob/main/pkg/apis/management.cattle.io/v3/cluster_types.go
- Rancher settings source showing the `server-version` setting exists: https://github.com/rancher/rancher/blob/main/pkg/settings/setting.go

## Issues Found
- The environment inventory block was labeled as `yaml`, but it was not valid YAML. I changed the fence to `text` so the snippet is no longer presented as machine-valid configuration.
- The checklist said to "Verify upgrade path (no skipped versions)." I changed this to "Verify the supported upgrade path for the target version" because Rancher documents supported upgrade paths and version-specific caveats rather than a universal "never skip versions" rule.
- The checklist and backup command referred to "Run Rancher Backup operator." Rancher documents that the operator must be installed first and that backups are performed by creating a `Backup` custom resource, so I updated the wording accordingly.
- The verification commands queried `server-version` with `kubectl get settings ... -n cattle-system`. Rancher `Setting` resources are cluster-scoped, so I changed both occurrences to `kubectl get settings.management.cattle.io server-version -o jsonpath='{.value}'` without a namespace.
- The rollback procedure implied that a Helm rollback alone was the primary Rancher rollback path. Rancher documents restoring Rancher from a backup-created `Restore` custom resource and then rolling back the Helm release, so I updated the procedure to reflect that and clarified that RKE2 etcd snapshot restoration requires following the full RKE2 restore procedure.

## Review Notes
Rollback behavior in Rancher is version-sensitive. Rancher documents special rollback handling for some version boundaries, including rollbacks from v2.6.4+ and v2.7.7+ to earlier versions in those lines, so teams should still check the release notes and rollback docs for the exact source and target versions before executing a production rollback.
