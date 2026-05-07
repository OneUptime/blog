# Validation Summary: How to Upgrade Rancher to the Latest Version

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Kubernetes
- Helm
- RKE/RKE1
- RKE2
- K3s
- kubectl

## Sources Consulted
- Rancher Upgrades: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster/upgrades
- Rancher Backup, Restore, and Disaster Recovery: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery
- Rancher Rollbacks: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster/rollbacks
- Rancher Agents: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/about-rancher-agents
- Rancher Registered Clusters troubleshooting: https://ranchermanager.docs.rancher.com/v2.14/troubleshooting/other-troubleshooting-tips/registered-clusters
- Rancher best practices for disconnected clusters: https://ranchermanager.docs.rancher.com/v2.12/reference-guides/best-practices/rancher-managed-clusters/disconnected-clusters
- RKE one-time snapshots: https://rke.docs.rancher.com/etcd-snapshots/one-time-snapshots
- RKE2 backup and restore: https://documentation.suse.com/cloudnative/rke2/latest/en/datastore/backup_restore.html
- K3s etcd-snapshot CLI: https://docs.k3s.io/cli/etcd-snapshot
- Helm upgrade command: https://helm.sh/docs/helm/helm_upgrade/
- Helm repo update command: https://helm.sh/docs/helm/helm_repo_update/
- Helm rollback command: https://helm.sh/docs/helm/helm_rollback/
- Kubernetes `kubectl rollout status`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/

## Issues Found
- Corrected the Rancher version check commands from namespaced `kubectl get settings ... -n cattle-system` usage to cluster-scoped `kubectl get setting ...`, because Rancher settings are cluster-scoped resources.
- Updated the backup guidance to match Rancher's documented backup method for Kubernetes installs: the `rancher-backup` operator in the local cluster. Kept etcd snapshots as an additional cluster-level safeguard instead of presenting them as the primary Rancher backup mechanism.
- Clarified that the `rke2 etcd-snapshot` and `k3s etcd-snapshot` commands apply to embedded etcd.
- Reworked the downstream agent section to reflect documented behavior: Rancher upgrades managed-cluster agent software automatically, so the correct validation step is checking cluster-agent health/logs in each downstream cluster with that cluster's kubeconfig.
- Fixed the rollback guidance so it distinguishes Rancher backup restoration from full Kubernetes cluster recovery via etcd snapshot.
- Added accuracy notes that Helm release names and Rancher chart repository names may differ from the defaults used in the examples.
- Replaced the unsupported blanket advice about never skipping multiple minor versions with a release-note and supported-upgrade-path check.

## Review Notes
- The post is technically sound after the corrections above.
- Rancher's upgrade docs now also call out version-specific checks such as feature chart compatibility, repository switching steps, and some cert-manager caveats. Those are not required for this post to be correct, but they may be worth covering in a future revision if the post is expanded.
