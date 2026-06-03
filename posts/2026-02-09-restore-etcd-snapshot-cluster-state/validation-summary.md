# Validation Summary: How to Restore etcd from Snapshot and Recover Kubernetes Cluster State

## Status
validated

## Post Type
Tutorial / disaster recovery guide

## Technologies Covered
- etcd
- Kubernetes control plane
- Kubernetes static pods
- etcdctl
- etcdutl
- kubectl
- systemd
- crictl
- Bash scripting

## Sources Consulted
- etcd Disaster Recovery documentation: https://etcd.io/docs/v3.6/op-guide/recovery/
- Kubernetes Operating etcd clusters documentation: https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes Debugging Kubernetes nodes with crictl: https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/

## Issues Found
- Replaced `etcdctl snapshot status` with `etcdutl snapshot status` because Kubernetes and etcd documentation note that `etcdctl snapshot status` is deprecated in etcd v3.5 and `etcdutl` is the current utility for snapshot status checks.
- Replaced `etcdctl snapshot restore` with `etcdutl snapshot restore` in all restore examples and the automation script because current etcd documentation uses `etcdutl` for snapshot restore, and etcd v3.6 restricts `etcdctl` to taking snapshots rather than restoring them.
- Added `--bump-revision` and `--mark-compacted` to restore commands because etcd documentation recommends these options for Kubernetes restores to prevent watchers and informer caches from observing a lower revision after restore.
- Replaced `docker ps` with `crictl ps` for checking static control plane containers because current Kubernetes nodes use CRI-compatible runtimes, and `crictl` is the documented node-level troubleshooting tool.
- Quoted snapshot and backup path variables in the restore script to avoid shell word-splitting issues.
- Completed the rollback path in the restore script by restoring the static pod manifests and starting etcd after moving the backup data directory back.
- Fixed malformed Markdown fences in the runbook example, including nested code fences and incorrect closing fence labels.

## Review Notes
The commands remain example-oriented and assume the cluster's etcd member names, peer URLs, certificate paths, service layout, and data directory match the sample values. Operators should still adapt those values to their actual control plane topology and etcd version.
