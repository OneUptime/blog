# Validation Summary: How to Benchmark Persistent Volume Performance with fio on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Jobs
- Kubernetes PersistentVolumeClaims and StorageClasses
- kubectl
- fio
- jq
- Kubernetes Metrics API
- Prometheus and cAdvisor metrics

## Sources Consulted
- Kubernetes Job API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/job-v1/
- kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes StorageClasses documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Resource Metrics Pipeline documentation: https://kubernetes.io/docs/tasks/debug-application-cluster/resource-metrics-pipeline/
- Kubernetes Metrics API reference: https://kubernetes.io/docs/reference/external-api/metrics.v1beta1/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics
- fio documentation: https://fio.readthedocs.io/en/master/fio_doc.html
- cAdvisor Prometheus metrics documentation: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md

## Issues Found
- Several fio Job examples used `--directory=/data/fio-test`, but only the initial placeholder Job created that directory. Changed the examples and ConfigMap suite to use `--directory=/data`, which is guaranteed to exist because it is the PVC mount path.
- The comprehensive fio suite wrote JSON to `/data/results.json`, then the parser read from `kubectl logs`. Removed the file output so fio writes JSON to stdout, making the parser work after the Job completes.
- The parser selected the Job pod using `-o name`, then passed that value inconsistently. Changed it to a pod name via `jsonpath` and used `kubectl logs "$POD"`.
- The jq parser read `lat_ns` percentiles even though the suite did not enable total latency percentiles. Changed the extracted latency fields to `clat_ns`, which fio reports for completion latency percentiles by default.
- The storage-class comparison script waited for each PVC to become `Bound` before creating a Pod. That can fail for StorageClasses using `WaitForFirstConsumer`, where binding is intentionally delayed until a Pod references the claim. Removed the pre-Job PVC wait.
- The storage-class comparison fio command omitted `--size`, so fio did not have an explicit test file size. Added `--size=10G`.
- The Metrics API example attempted to read nonexistent `volumeUsage` fields from PodMetrics. Changed it to display the CPU and memory `usage` fields that the metrics.k8s.io API actually exposes.
- The Prometheus examples used `kubelet_volume_stats_inodes_used` and `kubelet_volume_stats_used_bytes` as I/O operation and throughput metrics, but those are inode and capacity usage gauges. Replaced them with cAdvisor `container_fs_reads_total`, `container_fs_writes_total`, `container_fs_reads_bytes_total`, and `container_fs_writes_bytes_total` rate examples.

## Review Notes
The fio image is pinned to `latest`, which is valid YAML but can reduce reproducibility. For production benchmark procedures, pinning a known fio image digest or version would make results easier to compare over time.
