# Validation Summary: How to Monitor Upgrade Progress with Node Conditions and Pod Events

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- Bash
- jq
- Prometheus / PromQL
- kube-state-metrics
- Prometheus Operator PrometheusRule

## Sources Consulted
- Kubernetes Node Status documentation: https://kubernetes.io/docs/reference/node/node-status
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes Field Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes Pod Lifecycle documentation: https://v1-34.docs.kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes Events API documentation: https://kubernetes.io/docs/reference/kubernetes-api/events/event-v1/
- Kubernetes API deprecation guide for Events: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics node metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The node upgrade status script had an invalid `echo` line with two commands accidentally joined together. Split it into two valid `echo` statements.
- The `custom-columns` examples used unquoted JSONPath expressions containing parentheses, which Bash can parse as syntax before `kubectl` runs. Quoted the `custom-columns` arguments.
- The pod rescheduling and validation scripts used `status.phase=Terminating`, but Kubernetes Pod phases are `Pending`, `Running`, `Succeeded`, `Failed`, and `Unknown`; `Terminating` is a kubectl display status. Changed those checks to use `.metadata.deletionTimestamp`.
- The metrics script described "cluster capacity" while using `kubectl top`, which reports current resource usage. Updated the wording and made CPU and memory aggregation unit-aware.
- The metrics script grepped for `etcd_disk` via the kube-apiserver `/metrics` endpoint, which is not a current Kubernetes API server metric. Replaced it with `apiserver_storage_size_bytes` from the Kubernetes metrics reference.
- The dashboard used `kubelet_running_pods` to count nodes by kubelet version, but that metric does not carry kubelet version. Replaced it with `count by (kubelet_version) (kube_node_info)`.
- The dashboard and alerting examples used nonexistent `kube_pod_deletion_total` metrics. Replaced them with `kube_pod_deletion_timestamp` queries from kube-state-metrics.
- The API server latency PromQL used `histogram_quantile` directly over bucket rates. Added `sum by (le)` aggregation for a valid cluster-level classic histogram query.
- The pending pod alert used per-pod phase series while describing `$value` as a pod count. Aggregated the query with `sum(...)` so the alert value matches the annotation.

## Review Notes
- `kubectl` is not installed in this workspace, so live cluster command execution was not possible. Bash snippets were syntax-checked with `bash -n`, YAML snippets were parsed with PyYAML, and command/API behavior was checked against official Kubernetes, Prometheus, kube-state-metrics, and Prometheus Operator documentation.
- Event examples using `kubectl get events` remain valid for the documented field selectors, but Kubernetes Events have limited retention and the newer Events API uses fields such as `eventTime` and `regarding`; future revisions could consider using `kubectl events` for newer clusters.
