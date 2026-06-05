# Validation Summary: How to Right-Size Kubernetes Pod CPU and Memory Requests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes resource requests and limits
- OpenTelemetry Collector
- OpenTelemetry Collector kubeletstats receiver
- OpenTelemetry Python metrics API
- kube-state-metrics
- Prometheus remote write
- PromQL
- Python

## Sources Consulted
- Kubernetes resource management for Pods and containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- OpenTelemetry Kubernetes Collector components: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector kubeletstats receiver README: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/kubeletstatsreceiver
- OpenTelemetry Collector kubeletstats receiver generated metrics documentation: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/receiver/kubeletstatsreceiver/documentation.md
- OpenTelemetry Collector configuration environment variable substitution: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- kube-state-metrics pod metrics documentation: https://raw.githubusercontent.com/kubernetes/kube-state-metrics/main/docs/metrics/workload/pod-metrics.md
- Prometheus PromQL basics and subqueries: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus PromQL functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus HTTP API remote write receiver: https://prometheus.io/docs/prometheus/latest/querying/api/#remote-write-receiver

## Issues Found
- The kubeletstats endpoint used `${K8S_NODE_NAME}` while current OpenTelemetry Collector examples use `${env:K8S_NODE_NAME}`. Updated the Collector configuration snippet.
- The Prometheus remote write exporter pointed at Prometheus' `/api/v1/write` endpoint without noting that Prometheus must enable the remote write receiver. Added a short comment about `--web.enable-remote-write-receiver`.
- The Python GC counter was created but never incremented. Added a `gc.callbacks` hook that records completed GC collections.
- The PromQL examples used cAdvisor-style `container_cpu_usage_seconds_total` while the post's collection path is the OpenTelemetry kubeletstats receiver. Updated examples to use kubeletstats-derived `container_cpu_time_seconds_total` and OTel resource labels.
- The PromQL examples assumed kube-state-metrics labels would directly match kubeletstats resource labels. Added label mapping with `label_replace` for joins between kube-state-metrics request metrics and kubeletstats usage metrics.
- The post incorrectly stated that setting a CPU request too low causes throttling. Updated the wording to distinguish CPU request weighting under contention from throttling caused by CPU limits.
- The recommendation script used the old CPU metric, filtered kubeletstats metrics by the wrong label, matched only by container name, referenced an undefined `find_matching_metric`, and did not check HTTP errors. Updated the script to use namespace/pod/container matching across OTel and kube-state-metrics labels, added the missing helper, and added `raise_for_status()`.
- The safety section described low CPU requests as throttling. Updated it to refer to latency from CPU contention and CPU throttling only when CPU limits are changed.

## Review Notes
- `promtool` was not installed in the workspace, so PromQL parser validation could not be run locally. The PromQL was reviewed against official Prometheus syntax documentation.
- The Python snippets were checked with `python3` AST parsing and are syntactically valid.
- kube-state-metrics documents `kube_pod_container_resource_requests` as stable, but also recommends scheduler-provided request metrics for higher precision where available.
