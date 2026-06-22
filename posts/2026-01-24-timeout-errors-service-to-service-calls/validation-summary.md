# Validation Summary: How to Fix 'Timeout' Errors in Service-to-Service Calls

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Go net/http client timeouts and retry logic
- Kubernetes Services, Deployments, readiness probes, kubectl diagnostics
- Istio VirtualService retries and timeouts
- Istio DestinationRule connection pools and outlier detection
- Prometheus metrics and PromQL
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Go net/http package documentation: https://pkg.go.dev/net/http
- Go net package documentation: https://pkg.go.dev/net
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes liveness, readiness, and startup probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio istioctl diagnostic tooling documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl/
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Operator API reference for ServiceMonitor: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Go HTTP client snippet used `net.Dialer` without importing the `net` package. Added the missing `net` import so the snippet is syntactically correct.
- The Kubernetes `apps/v1` Deployment snippet omitted the required `.spec.selector` and matching pod template labels. Added `selector.matchLabels` and `template.metadata.labels` for `app: user-service`.
- The readiness probe comment referred to a "service timeout", but a Kubernetes Service does not define that timeout. Reworded it to tie the probe timeout to the health endpoint's expected latency.
- The retry guidance said to always implement retries. Reworded it to recommend retries for safe or idempotent operations because retrying non-idempotent operations can duplicate side effects.
- The PromQL comment said "P99 latency by service", but the query grouped only by `le`. Added `job` to the aggregation so the histogram quantile is grouped by a service-like label.

## Review Notes
The snippets are example configurations and still need environment-specific values such as namespaces, metric labels, service port names, and retry policies. The Go retry example is most appropriate for requests with no body or reusable bodies; production clients should ensure request bodies can be replayed before retrying.
