# Validation Summary: How to Set Up Ceph Storage for Prometheus TSDB on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RBD (RADOS Block Device)
- Prometheus TSDB (Time Series Database)
- Kubernetes StorageClass and PersistentVolumeClaims
- kube-prometheus-stack Helm chart
- Prometheus Operator CRD (prometheusSpec)

## Sources Consulted
- Rook Ceph Block Storage (CephBlockPool and StorageClass) documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Kubernetes StorageClass API reference: https://kubernetes.io/docs/concepts/storage/storage-classes/
- kube-prometheus-stack Helm chart values (prometheus.prometheusSpec.storageSpec): https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- Prometheus Operator API reference (PrometheusSpec): https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus HTTP API (/api/v1/status/tsdb): https://prometheus.io/docs/prometheus/latest/querying/api/#tsdb-stats
- Ceph RBD configuration reference (rbd_cache_writethrough_until_flush): https://docs.ceph.com/en/latest/rbd/rbd-config-ref/

## Issues Found
No technical issues found.

## Review Notes
- The StorageClass includes `imageFormat: "2"` which is the default in modern Rook versions. Including it explicitly is not wrong but could be omitted for brevity.
- The service name in the `port-forward` command (`kube-prometheus-prometheus`) is an approximation; the actual service name depends on the Helm release name and chart version. This is standard practice in tutorials and not an error.
- The `rbd_cache_writethrough_until_flush` Ceph tunable is mentioned as a recommendation but the post does not show exactly where/how to configure it (e.g., in ceph.conf or via `ceph config set`). This is a minor completeness gap, not a correctness issue.
- WAL compression (`walCompression: true`) is a valid Prometheus Operator field and good advice for reducing I/O on block storage.
