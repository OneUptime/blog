# Validation Summary: How to Compact and Defragment etcd to Reclaim Storage Space

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- etcd and etcdctl
- Kubernetes and kubeadm static Pod manifests
- Kubernetes CronJob resources
- Prometheus metrics and ServiceMonitor resources
- Bash maintenance scripts

## Sources Consulted
- etcd Operations Guide: Maintenance - https://etcd.io/docs/v3.6/op-guide/maintenance/
- etcd Operations Guide: Configuration options - https://etcd.io/docs/v3.6/op-guide/configuration/
- etcd Metrics documentation - https://etcd.io/docs/v3.6/metrics/
- etcd generated metrics list - https://etcd.io/docs/v3.6/metrics/etcd-metrics-latest/
- etcd tutorial: How to check Cluster status - https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/
- Kubernetes kube-apiserver reference - https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Prometheus Operator API reference: ServiceMonitor - https://prometheus-operator.dev/docs/api-reference/api/
- Local verification with `registry.k8s.io/etcd:3.5.9-0` and `etcdctl endpoint status -w json`

## Issues Found

1. **Several `jq` expressions used the wrong etcdctl JSON path.** `endpoint status -w json` returns an array, and the current revision is under `.Status.header.revision`. Updated the affected examples to iterate with `.[]` and use the correct revision path.

2. **The "compaction revision" check was misleading.** The command shown returned the current response revision, not the last compacted revision or retained history. Reworded the section to check current revision and compare physical database size with `dbSizeInUse`.

3. **Manual compaction examples could compact an invalid negative revision.** Added simple guards before compacting to `current revision - 1000` or `current revision - 100`.

4. **The kubeadm auto-compaction example edited the wrong static Pod.** Auto-compaction is an etcd setting, not a kube-apiserver flag. Changed the example to edit `/etc/kubernetes/manifests/etcd.yaml` and add `--auto-compaction-mode` plus `--auto-compaction-retention`.

5. **The Kubernetes CronJob was described as suitable for managed etcd and relied on `jq` in the etcd image.** Managed control planes generally do not expose host etcd certificates or localhost etcd. The official Kubernetes etcd image also does not include `jq`. Reworded the example for self-managed kubeadm stacked etcd and simplified the container command to use `etcdctl defrag --cluster`.

6. **The ServiceMonitor manifest used the wrong API group.** Changed `apiVersion: v1` to `monitoring.coreos.com/v1`.

7. **Prometheus queries mislabeled metrics.** Replaced the backend commit latency query that was labeled as compaction duration, and changed the defragmentation query to use the backend defrag histogram.

8. **`etcdctl check perf` was labeled as a corruption check.** Updated the comment to describe it as a performance check.

## Review Notes
- The article uses `ETCD_AUTO_COMPACTION_*` environment variables and direct etcd flags. Both are valid for etcd, but the exact file to edit depends on how etcd is installed.
- The `ServiceMonitor` example still assumes a Prometheus Operator installation and a Service with a named `metrics` port and matching labels.
- The cron-based shell script assumes `jq`, `bc`, and local certificate paths are available on the host.
