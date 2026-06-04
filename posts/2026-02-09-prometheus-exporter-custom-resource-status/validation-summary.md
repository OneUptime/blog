# Validation Summary: How to Build a Prometheus Exporter That Scrapes K8s Custom Resource Status

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Kubernetes Custom Resource Definitions
- Kubernetes client-go dynamic clients and informers
- Prometheus client_golang
- Prometheus metrics and PromQL alerts
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- Docker
- Kubernetes RBAC, Deployments, Services, and ServiceAccounts

## Sources Consulted
- Kubernetes CRD status subresource documentation: https://kubernetes.io/docs/tasks/access-kubernetes-api/custom-resources/custom-resource-definitions/#status-subresource
- Kubernetes CRD API reference: https://kubernetes.io/docs/reference/kubernetes-api/apiextensions/custom-resource-definition-v1/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- client-go cache package documentation: https://pkg.go.dev/k8s.io/client-go/tools/cache
- Prometheus metric and label naming documentation: https://prometheus.io/docs/practices/naming/
- Prometheus metric types documentation: https://prometheus.io/docs/concepts/metric_types/
- Prometheus exporter writing guidelines: https://prometheus.io/docs/instrumenting/writing_exporters/
- Prometheus client_golang package documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Docker build documentation: https://docs.docker.com/build/building/packaging/
- Docker image push documentation: https://docs.docker.com/engine/reference/commandline/image_push/
- Go release policy and history: https://go.dev/doc/devel/release
- Alpine Linux release branches: https://www.alpinelinux.org/releases/

## Issues Found
- The initial Go exporter snippet imported `metav1` but did not use it, which would make the example fail to compile. Removed the unused import.
- The phase metric example and implementation were inconsistent: the text showed a phase series value of `1`, while the code encoded `Running`, `Completed`, and `Failed` as `1`, `2`, and `3`. Changed the implementation to a one-hot phase gauge where the active phase is set to `1`.
- The update handler called `backupPhase.Reset()`, which would remove phase metrics for every backup whenever any single backup changed. Replaced it with per-resource deletion of known phase label values before setting the current phase.
- The delete handler assumed delete events always contain `*unstructured.Unstructured`. client-go delete handlers can receive `cache.DeletedFinalStateUnknown`, so the example could panic. Added tombstone handling.
- The delete handler attempted to remove the phase metric with an empty phase label, which would not delete the actual phase-labelled series. Changed it to delete each known phase for the resource.
- The time parsing code ignored RFC3339 parse errors, which could publish invalid durations. Added error checks and logging.
- The status count metrics used `_total` names while being exported as Gauges. Prometheus reserves `_total` by convention for accumulating counters, so the metrics were renamed to `backup_success_count` and `backup_failure_count`, and the example PromQL was updated.
- The Dockerfile used `golang:1.21` and `alpine:3.18`; both are outside current support as of the validation date. Updated the examples to `golang:1.26` and `alpine:3.22`.
- The readiness endpoint example referenced an undefined `informerSynced` variable. Changed it to pass `informer.HasSynced` into a `readyCheck` handler factory.
- The multi-CRD watcher snippet used `func(*unstructured.Unstructured)` handlers where informer callbacks expect `func(interface{})`, causing type mismatches. Added type assertions inside the informer callbacks.
- The post said CRDs "use status subresources" categorically, but Kubernetes documents status subresources as optional for custom resources. Changed the wording to "often use status subresources."

## Review Notes
The examples assume the Prometheus Operator CRDs are installed before applying `ServiceMonitor` and `PrometheusRule`. The exporter is intentionally scoped to a sample Backup CRD; production exporters should usually make the group/version/resource, namespace scope, and status field mappings configurable.
