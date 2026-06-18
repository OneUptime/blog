# Validation Summary: Using OpenTelemetry Metrics to Detect Under- and Overprovisioned Services

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Kubernetes Attributes Processor
- Prometheus Remote Write
- Prometheus and PromQL
- Prometheus alerting rules
- kube-state-metrics
- Kubernetes resource requests
- Python requests

## Sources Consulted
- OpenTelemetry Kubernetes Collector components: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector Prometheus Remote Write Exporter: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- Prometheus querying basics and subqueries: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus operators and vector matching: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus HTTP API: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- kube-state-metrics project documentation: https://github.com/kubernetes/kube-state-metrics
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics
- Requests API documentation: https://requests.readthedocs.io/

## Issues Found
- The Collector config used the deprecated `prometheusremotewrite` exporter component name. Changed it to `prometheus_remote_write`, which is the current documented exporter type.
- The Collector config exported resource attributes to Prometheus remote write without enabling resource-to-telemetry conversion. Added `resource_to_telemetry_conversion.enabled: true` so Kubernetes resource metadata is available as Prometheus labels.
- The Kubernetes attributes processor associated pods only by a `k8s.pod.ip` resource attribute, which many SDKs do not emit. Added connection-based pod association, matching the documented default behavior.
- The Prometheus remote write example did not mention that Prometheus must enable its remote write receiver. Added the required `--web.enable-remote-write-receiver` note.
- The PromQL examples attempted to aggregate by Deployment without a reliable Deployment label on cAdvisor and kube-state-metrics pod/container series. Replaced pod-name regex extraction and direct Deployment grouping with kube-state-metrics joins through `kube_pod_owner` and `kube_replicaset_owner`.
- The initial PromQL used `by (namespace)` after `quantile_over_time`, which is not valid function syntax and also dropped the Deployment label. Removed the invalid grouping and preserved `namespace` and `deployment` through the inner aggregations.
- The CPU request query in the Python script multiplied Deployment replicas by an average container request grouped by Deployment, but `kube_pod_container_resource_requests` is pod/container scoped and does not carry a Deployment label by default. Replaced it with the same pod-owner joins used in the query examples.
- The savings function expected `requested_cpu_cores`, but the report script never populated that field. Added a request query and populated `requested_cpu_cores` in the report.
- The Prometheus alert rules grouped raw container metrics by Deployment without adding a Deployment label. Updated the alert expressions to use the same Deployment owner joins as the main detection queries.

## Review Notes
The examples assume kube-state-metrics and cAdvisor or kubelet container metrics are being scraped into Prometheus alongside OpenTelemetry-exported metrics. The corrected queries focus on Kubernetes Deployments; StatefulSets, DaemonSets, Jobs, and standalone Pods would need equivalent owner joins or separate rules.
