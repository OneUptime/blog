# Validation Summary: How to Resize Persistent Volumes in Kubernetes Without Downtime

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- StorageClass volume expansion
- CSI drivers
- StatefulSets
- kubectl
- Prometheus metrics and alerting

## Sources Consulted
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/#expanding-persistent-volumes-claims
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/#volume-expansion
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Resource Metrics Pipeline documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/
- Kubernetes Node Metrics Data documentation: https://kubernetes.io/docs/reference/instrumentation/node-metrics/
- Kubernetes CSIDriver API reference: https://kubernetes.io/docs/reference/kubernetes-api/storage/csi-driver-v1/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/

## Issues Found
- The introduction implied online expansion always works without pod restarts. Updated the wording to clarify that online expansion depends on the storage driver and filesystem support.
- The post said it covers expanding PVs, but the workflow expands PVC requests and Kubernetes resizes the backing volume. Updated the wording to "PVCs".
- The prerequisites did not mention filesystem constraints. Added the supported filesystem caveat for filesystem resizing.
- The CSI driver list was labeled as online-expansion support. Changed it to a list of common drivers with volume expansion support and added a note to verify online filesystem expansion in driver documentation.
- A shell command block for checking `FileSystemResizePending` was marked as YAML. Changed the code fence to `bash`.
- The StatefulSet PVC listing used `-l app=postgres`, but the shown `volumeClaimTemplates` did not define that label. Changed the command to list PVCs by the StatefulSet-generated PVC name prefix.
- The autoscaler example attempted to read PVC storage usage from the Kubernetes Metrics API, which only provides CPU and memory metrics for nodes and pods. Reworked it to query Prometheus for `kubelet_volume_stats_used_bytes` and `kubelet_volume_stats_capacity_bytes`.
- The autoscaler example tried to multiply a Kubernetes quantity such as `10Gi` directly with `bc`, then appended another `Gi`. Reworked the snippet to parse `Gi` quantities and produce a valid patched size.
- The troubleshooting section suggested `CSIDriver` output shows volume expansion capability. Kubernetes `CSIDriver` objects do not expose expansion support directly, so the section now lists registered CSI drivers and tells readers to confirm the StorageClass provisioner support in the driver's documentation.

## Review Notes
- The post is technically valid after edits. Future improvements could add provider-specific links for each listed CSI driver because online expansion details can vary by driver version, filesystem, and volume mode.
