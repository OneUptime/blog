# Validation Summary: How to Plan and Execute Kubernetes etcd Migration from v2 to v3 Storage Backend

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- etcd v2 and v3 storage backends
- etcdctl
- kube-apiserver configuration
- PrometheusRule monitoring configuration

## Sources Consulted
- etcd official migration guide for v2store to v3store: https://etcd.io/docs/v3.4/how-to-migrate/
- etcd official v2.3 administration guide for backup and restore behavior: https://etcd.io/docs/v2.3/admin_guide/
- Kubernetes official etcd operations guide: https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/
- Kubernetes kube-apiserver command-line reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes ComponentStatus API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/component-status-v1/

## Issues Found
- The introduction claimed the migration could maintain cluster availability. Offline etcd v2store-to-v3store migration requires stopping writers and etcd nodes, so the wording now describes a controlled maintenance window.
- The storage-backend check treated a successful `ETCDCTL_API=2 etcdctl ls /` as proof that Kubernetes was using v2 storage. That only proves the legacy v2 keyspace is reachable, so the output text was corrected.
- The post did not mention that `etcdctl migrate` was removed in etcd v3.5. The migration section and conclusion now state that etcdctl v3.4 or earlier is required.
- The migration command stopped only the API server and did not stop etcd before offline migration. The example now stops API-server writers and etcd, then restarts etcd before validation.
- The migration command omitted `--wal-dir`. The example now includes the WAL directory flag for the default WAL location.
- `kubectl get componentstatuses` uses a Kubernetes API deprecated since v1.19. It was replaced with `kubectl get --raw='/readyz?verbose'`.
- The backup and rollback examples used unquoted variables and copied the whole backup directory incorrectly. The examples now store the backup data directory separately, quote paths, move failed data aside, and restore the backed-up data directory.

## Review Notes
The commands remain examples and may need endpoint, TLS certificate, static Pod, or multi-member cluster adjustments for a specific Kubernetes deployment. The post now calls out the most important version caveat for modern etcd: use etcdctl v3.4 or earlier for `migrate`.
