# Validation Summary: How to Roll Back a Failed Rancher Upgrade

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm 3
- etcd
- RKE1
- RKE2
- K3s

## Sources Consulted
- Rancher rollback documentation: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster/rollbacks
- Rancher install/upgrade on Kubernetes: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher webhook reference: https://ranchermanager.docs.rancher.com/reference-guides/rancher-webhook
- Rancher backup/restore for Rancher-launched Kubernetes clusters: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/back-up-rancher-launched-kubernetes-clusters
- RKE1 snapshot restore: https://rke.docs.rancher.com/etcd-snapshots/restoring-from-backup
- RKE2 backup and restore: https://docs.rke2.io/datastore/backup_restore
- RKE2 rollback guidance: https://docs.rke2.io/upgrades/roll-back
- K3s backup and restore: https://docs.k3s.io/datastore/backup-restore
- K3s etcd snapshot restore: https://docs.k3s.io/cli/etcd-snapshot
- Helm command reference: https://helm.sh/docs/helm/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs

## Issues Found
- The post originally treated Helm rollback as a standalone Rancher rollback method. I corrected the introduction and Helm section to reflect Rancher's documented rollback flow: restore the pre-upgrade Rancher or local-cluster state first, then start the previous Rancher version with Helm.
- The RKE1 section incorrectly told readers to run `rke up` after `rke etcd snapshot-restore`. I removed that recovery step and clarified that, for RKE v0.2.0+ releases, the restore command already rebuilds the cluster and restarts system pods.
- The RKE2 and K3s restore sections said to stop services on "all nodes" even though the documented restore flow is for server nodes. I corrected that wording.
- The K3s section was incomplete for HA clusters because it omitted the documented cleanup and rejoin steps for the remaining server nodes. I added those steps.
- The post recommended a Rancher UI "rotate agent certificates" action to recover downstream agents after rollback. I replaced that with supported guidance to verify that the `cattle-cluster-agent` reconnects and to inspect downstream agent pods if a cluster remains unavailable.
- Several commands were made more precise and current: `kubectl logs deploy/rancher`, `kubectl rollout status deploy/rancher`, a fully qualified Rancher `settings.management.cattle.io` version check, exact webhook resource inspection/deletion commands, and a safer reinstall fallback that includes `--create-namespace` and `--wait`.
- The post did not mention that RKE1 is end-of-life. I added a legacy note with the exact EOL date, July 31, 2025.

## Review Notes
- Rancher rollback behavior is version-sensitive. Official docs call out extra rollback cleanup requirements for some upgrade paths, including Rancher v2.6.4+, v2.7.7+, and v2.14.0+.
- The post remains focused on Helm-installed Rancher running on RKE1/RKE2/K3s local clusters. Rancher installations that use other underlying datastore patterns or different installation methods follow different rollback procedures.
- RKE1 is retained in the post only as legacy coverage; it is no longer a current platform choice.
