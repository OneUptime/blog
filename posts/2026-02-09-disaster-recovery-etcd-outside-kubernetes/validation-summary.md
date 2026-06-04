# Validation Summary: How to Set Up Disaster Recovery for etcd Clusters Running Outside Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- etcd
- Kubernetes
- systemd timers
- Bash scripting
- AWS CLI and Amazon S3 storage classes
- Google Cloud Storage CLI
- Prometheus Pushgateway
- Prometheus Operator PrometheusRule

## Sources Consulted
- etcd disaster recovery documentation: https://etcd.io/docs/v3.5/op-guide/recovery/
- etcd database snapshot documentation: https://etcd.io/docs/v3.7/tasks/operator/how-to-save-database/
- etcd runtime reconfiguration documentation: https://etcd.io/docs/v3.4/op-guide/runtime-configuration/
- Kubernetes etcd administration documentation: https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/
- Prometheus Pushgateway documentation: https://github.com/prometheus/pushgateway
- Prometheus pushing metrics documentation: https://prometheus.io/docs/instrumenting/pushing/
- AWS CLI s3 cp command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- GNU Coreutils stat manual: https://www.gnu.org/software/coreutils/manual/html_node/stat-invocation.html
- Prometheus Operator PrometheusRule API reference: https://doc.crds.dev/github.com/prometheus-operator/prometheus-operator/monitoring.coreos.com/PrometheusRule/v1

## Issues Found
- The backup script used multiple endpoints for `etcdctl snapshot save`. etcd snapshot save should target a single endpoint, so the script now uses one `ETCD_ENDPOINT`.
- The snapshot status and restore examples used `etcdctl snapshot status` / `etcdctl snapshot restore`. Current etcd and Kubernetes documentation recommends `etcdutl` for snapshot status and restore, so those examples were updated.
- The restore script did not stop Kubernetes API servers before restoring etcd. Kubernetes documentation warns that API servers should be stopped during etcd restore, so the restore example now stops API servers first and restarts control plane components afterward.
- The restore script did not handle local `.gz` backup files even though later examples pass compressed snapshots. It now decompresses gzip snapshots to `/tmp` without modifying the original backup.
- The restore example did not include `--bump-revision` and `--mark-compacted`, which etcd recommends when restoring Kubernetes-backed data to prevent stale informer cache behavior. These flags were added to the `etcdutl snapshot restore` command.
- The backup metrics command used BSD/macOS `stat -f%z`, which is incorrect for the Linux systemd environment shown in the post. It now uses GNU `stat -c%s`.
- The Prometheus alert expression did not fire if `etcd_backup_timestamp` was completely absent. It now uses `absent(etcd_backup_timestamp) or time() - etcd_backup_timestamp > 86400`.
- The split-brain section overstated etcd behavior under network partitions. The wording was narrowed to unhealthy members while a healthy quorum remains, and the member-add example now notes that the replacement member must be started with the configuration printed by `member add`.
- The replication example described S3 Glacier as tape storage. The wording now accurately calls it cold storage.
- The conclusion claimed hourly snapshots, while the main timer example runs daily. The wording now says regular snapshots.

## Review Notes
The examples remain illustrative and use placeholder hostnames, service names, buckets, and certificate paths that operators must adapt to their environment. For kubeadm static-pod control planes, stopping and restarting Kubernetes components would use manifest or kubelet workflows rather than the systemd service names shown here.
