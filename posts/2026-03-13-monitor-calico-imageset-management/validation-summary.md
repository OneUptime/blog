# Validation Summary: How to Monitor Calico ImageSet Management

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Calico and Tigera Operator ImageSet management
- Kubernetes Pods, DaemonSets, CronJobs, ConfigMaps, and ServiceAccounts
- kube-state-metrics
- Prometheus Operator PrometheusRule resources
- Prometheus Alertmanager
- Grafana dashboard queries
- Bash, kubectl, and PromQL

## Sources Consulted
- Calico ImageSet documentation: https://docs.tigera.io/calico/latest/operations/image-options/imageset
- Calico installation API reference for TigeraStatus: https://docs.tigera.io/calico/latest/reference/installation/api
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kube-state-metrics DaemonSet metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/daemonset-metrics.md
- kube-state-metrics custom resource state metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/customresourcestate-metrics.md
- Alertmanager API documentation: https://prometheus.io/docs/alerting/latest/alerts_api/
- Alertmanager project API notes: https://github.com/prometheus/alertmanager#api

## Issues Found
- The prerequisites did not mention kube-state-metrics even though the PromQL examples use kube-state-metrics metrics. Added it as a prerequisite.
- The CronJob example referenced a ServiceAccount but did not state the required pod-listing permission. Added a prerequisite note.
- The registry bypass script used a JSONPath expression that only associated the pod name with the first container image and did not check init containers. Replaced it with a kubectl Go template that emits pod name and image for each init container and regular container.
- The registry bypass script used a regex match for the expected registry, which could match unintended strings. Changed it to a prefix check for the expected registry path.
- The Alertmanager curl example used `/api/v1/alerts`; Alertmanager API v1 was deprecated and removed in current releases. Updated the example to `/api/v2/alerts`.
- The CronJob manifest did not mount the `/scripts/check-registry-bypass.sh` file it attempted to execute. Added a ConfigMap containing the script and mounted it into the CronJob.
- The TigeraStatus alert used `tigera_component_status`, which is not a built-in Calico metric. Updated the text to state that TigeraStatus conditions must be exported through kube-state-metrics custom resource state metrics or an equivalent exporter, and changed the example metric name to `tigera_status_condition`.
- The Grafana dashboard command implied that ImageSet creation time represented successful reconciliation. Replaced it with the official Installation status check for the currently applied ImageSet.

## Review Notes
The PrometheusRule resource structure, kube-state-metrics pod waiting reason metric, and DaemonSet availability metric names are current. The TigeraStatus PromQL rule still depends on the reader exporting a matching custom metric for the TigeraStatus CRD; the post now calls out that requirement explicitly.
