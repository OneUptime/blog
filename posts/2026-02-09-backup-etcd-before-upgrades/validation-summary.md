# Validation Summary: How to Backup etcd Before Kubernetes Cluster Upgrades

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- etcd
- etcdctl
- etcdutl
- kubectl
- kubeadm-style static Pod etcd deployments
- systemd timers
- AWS CLI / S3 backup storage
- OpenSSL encryption

## Sources Consulted
- Kubernetes documentation: Operating etcd clusters for Kubernetes - https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/
- etcd documentation: Disaster recovery - https://etcd.io/docs/v3.6/op-guide/recovery/
- etcd documentation: How to save the database - https://etcd.io/docs/v3.6/tasks/operator/how-to-save-database/
- Kubernetes kubectl reference: kubectl version - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Microsoft Learn: Backup and recovery for AKS - https://learn.microsoft.com/en-us/azure/architecture/operator-guides/aks/aks-backup-and-recovery
- Amazon EKS documentation: Backup your EKS clusters with AWS Backup - https://docs.aws.amazon.com/eks/latest/userguide/integration-backup.html
- systemd.timer manual - https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html

## Issues Found
- The post said managed Kubernetes services automatically back up etcd for users. I changed this to say managed services operate the control plane and generally do not expose direct etcd access, which better matches provider documentation and avoids implying user-managed etcd snapshot/restore access.
- The installation section only installed `etcdctl`. I updated it to install and verify both `etcdctl` and `etcdutl`, because current Kubernetes and etcd docs recommend `etcdutl` for snapshot status and restore operations.
- Several examples used `etcdctl snapshot status`. I changed them to `etcdutl snapshot status`, because `etcdctl snapshot status` is deprecated in etcd 3.5 and slated for removal in etcd 3.6.
- The restore test used `etcdctl snapshot restore`. I changed it to `etcdutl snapshot restore`, because `etcdctl` restore is deprecated in etcd 3.5 and slated for removal in etcd 3.6.
- The automated backup script opened the log file before creating the backup directory. I moved directory creation before `tee` so the script works on a fresh host.
- The automated backup script used `set -e` with manual `$?` checks after commands. I changed the snapshot and verification commands to `if ! command; then ... fi` so the intended error messages can actually run.
- The systemd timer had both `OnCalendar=daily` and `OnCalendar=*-*-* 02:00:00`, which would trigger on both schedules. I removed `OnCalendar=daily` so the timer runs at the intended 02:00 schedule.
- The pod-based backup script copied into `/var/backups` without ensuring the directory existed. I added directory creation before `kubectl cp`.
- The pre-upgrade script used `kubectl version --short`, which is not present in the current generated kubectl reference. I changed it to `kubectl version`.
- The pre-upgrade script described `kubectl get all` output as all resources. I changed the wording to "common resources" because `kubectl get all` does not export every Kubernetes resource type.

## Review Notes
- The examples assume kubeadm-style certificate paths and a local etcd endpoint on the control plane node. Those paths and endpoints should still be adjusted for non-kubeadm or external etcd deployments.
- The scripts focus on Kubernetes control-plane state. PersistentVolume application data still needs its own backup strategy.
