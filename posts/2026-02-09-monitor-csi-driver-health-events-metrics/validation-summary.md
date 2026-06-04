# Validation Summary: How to Monitor CSI Driver Health Using Kubernetes Events and Metrics

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Kubernetes
- Container Storage Interface (CSI)
- kubectl
- Kubernetes Events
- Prometheus and PromQL
- Prometheus Operator ServiceMonitor and PrometheusRule
- Grafana dashboards
- Loki / LogQL
- Elasticsearch / Kibana
- Kubernetes CronJob, PersistentVolumeClaim, Pod, and VolumeAttachment resources

## Sources Consulted
- Kubernetes CSI Developer Documentation: deploying CSI drivers - https://kubernetes-csi.github.io/docs/deploying.html
- Kubernetes CSI Developer Documentation: sidecar containers - https://kubernetes-csi.github.io/docs/sidecar-containers.html
- Kubernetes CSI external-provisioner documentation - https://kubernetes-csi.github.io/docs/external-provisioner.html
- Kubernetes csi-lib-utils metrics package documentation - https://pkg.go.dev/github.com/kubernetes-csi/csi-lib-utils/metrics
- Kubernetes csi-lib-utils metrics source - https://github.com/kubernetes-csi/csi-lib-utils/blob/master/metrics/metrics.go
- Kubernetes Metrics Reference - https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes kubectl logs reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl wait reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl run reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes Deprecated API Migration Guide for Events - https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes VolumeAttachment API reference - https://kubernetes.io/docs/reference/kubernetes-api/storage/volume-attachment-v1/
- Prometheus Operator API reference - https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- Corrected the CSI architecture description. The post described three main CSI components and said the node plugin handles attachment. Kubernetes CSI documentation describes a controller component and a per-node component, with sidecars such as the node-driver-registrar; attach operations are controller-side for attachable volumes, while node plugins handle node-local staging, mounting, and unmounting.
- Updated the event monitoring script to tolerate current `events.k8s.io/v1` field names. The original script used only legacy `lastTimestamp` and `involvedObject` fields; the corrected version falls back across `eventTime`, `series.lastObservedTime`, `deprecatedLastTimestamp`, `lastTimestamp`, and object references from `regarding` or `involvedObject`.
- Replaced the non-existent `csi_sidecar_operations_errors_total` examples. Current CSI sidecar metrics expose CSI operation duration/count histograms labeled by `grpc_status_code`; failures should be derived from `csi_sidecar_operations_seconds_count{grpc_status_code!="OK"}`.
- Replaced the `storage_operation_errors_total` attach/detach query with a query based on `storage_operation_duration_seconds_count` and `status!="success"`, matching the current Kubernetes Metrics Reference labels.
- Changed the PrometheusRule description from "AlertManager rules" to Prometheus alerting rules, since `PrometheusRule` resources define rules evaluated by Prometheus or Thanos Ruler.
- Corrected the health-check example so the node plugin probe targets a service if the driver exposes one, instead of `localhost` from an unrelated monitoring pod.
- Fixed the automated health test so the test pod is created, waited on, and deleted in the same `default` namespace as the test PVC.
- Fixed the Grafana operation success-rate expression to derive success percentage from the CSI histogram count metric and `grpc_status_code="OK"` instead of the removed error counter.
- Updated the Grafana pod-status query to use standard double-quoted PromQL label matchers.

## Review Notes
Several snippets still use placeholder names such as `csi-controller`, `csi-node`, and `storageClassName: csi-driver`; these are acceptable for a generic guide but must be adapted to the labels, ports, Services, and StorageClass used by a specific CSI driver. Local `kubectl` was not installed in the review environment, so CLI validation was performed against official Kubernetes command reference documentation rather than local `--help` output.
