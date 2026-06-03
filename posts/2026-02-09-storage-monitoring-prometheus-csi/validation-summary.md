# Validation Summary: How to Implement Storage Monitoring with Prometheus CSI Driver Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Container Storage Interface (CSI)
- CSI external-provisioner
- CSI external-attacher
- Kubelet volume stats
- Prometheus
- Prometheus Operator ServiceMonitor
- PrometheusRule
- Grafana dashboards

## Sources Consulted
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes Node Metrics Data: https://kubernetes.io/docs/reference/instrumentation/node-metrics/
- Kubernetes kubectl port-forward Reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes CSI external-provisioner documentation: https://kubernetes-csi.github.io/docs/external-provisioner.html
- kubernetes-csi/external-provisioner README: https://github.com/kubernetes-csi/external-provisioner/blob/master/README.md
- Kubernetes CSI external-attacher documentation: https://kubernetes-csi.github.io/docs/external-attacher.html
- kubernetes-csi/external-attacher README: https://github.com/kubernetes-csi/external-attacher/blob/master/README.md
- kubernetes-csi/csi-lib-utils metrics package: https://pkg.go.dev/github.com/kubernetes-csi/csi-lib-utils/metrics
- kubernetes-csi/csi-lib-utils metrics source: https://github.com/kubernetes-csi/csi-lib-utils/blob/master/metrics/metrics.go
- Prometheus Operator API Reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post claimed standard kubelet volume stats provide IOPS, throughput, and read latency metrics such as `kubelet_volume_stats_read_total` and `kubelet_volume_stats_read_time_seconds_total`. Kubernetes' official metrics reference only lists kubelet PVC volume stats for capacity, available bytes, inode usage, and volume health. I changed the performance section and alert example to use CSI plugin operation latency, and clarified that IOPS and throughput require driver-specific or storage backend metrics.
- The example sidecar deployment used the deprecated `--metrics-address` flag for `csi-provisioner` and `csi-attacher`. I changed both to `--http-endpoint`, which current official CSI sidecar READMEs recommend for diagnostics and metrics.
- The sidecar deployment used older sidecar image tags. I updated the examples to currently documented stable image tags: `csi-provisioner:v5.2.0` and `csi-attacher:v4.8.0`.
- The deployment gave both containers a port named `metrics`, which is ambiguous for ServiceMonitor usage. I renamed the container ports to `provisioner-metrics` and `attacher-metrics` to align with the Service ports.
- The provisioning success and failure rate PromQL divided vectors while retaining `grpc_status_code`, producing incorrect ratios. I changed those queries and alerts to aggregate with `sum(rate(...))` before division.
- The histogram quantile examples did not aggregate buckets explicitly. I changed the provisioning and RPC latency queries to aggregate buckets by `le`, `driver_name`, and `method_name`.
- The `csi-node` ServiceMonitor referenced a node metrics Service that was not created in the snippet. I added a short note that this ServiceMonitor assumes an existing matching Service for the CSI node DaemonSet.

## Review Notes
The post is technically relevant and salvageable. The remaining CSI plugin performance examples depend on drivers exposing `csi_plugin_operations_seconds`; not all CSI drivers export plugin metrics, so production dashboards should be adjusted to the metrics emitted by the specific storage driver and backend.
