# Validation Summary: How to Trace Network Latency Between Microservices with Istio

## Status
validated

## Post Type
Tutorial / Guide (hands-on, with code, manifests, and CLI commands)

## Technologies Covered
- Istio (service mesh, Telemetry API, EnvoyFilter)
- Jaeger (distributed tracing)
- Kiali (mesh visualization)
- Prometheus (metrics, PromQL)
- Grafana (dashboards)
- Kubernetes (kubectl, Deployments, Services, Namespaces)
- Envoy (proxy stats, tracing headers)
- Distributed tracing standards (B3, W3C Trace Context, Jaeger uber-trace-id)
- Python (Flask) and Node.js (Express) trace-propagation examples

## Sources Consulted
- Istio 1.20 Jaeger addon manifest: https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/jaeger.yaml
- Istio 1.20 Kiali addon manifest: https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/kiali.yaml
- Istio Distributed Tracing (Jaeger) docs: https://istio.io/latest/docs/tasks/observability/distributed-tracing/jaeger/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio "Remotely Accessing Telemetry Addons" docs: https://istio.io/latest/docs/tasks/observability/gateways/

## Issues Found
1. **Wrong Jaeger service name and port in port-forward command.** The post used `kubectl port-forward svc/jaeger-query -n istio-system 16686:16686`. The Istio addon does not create a `jaeger-query` Service — it creates a Service named `tracing` that exposes the query UI on port 80 (targetPort 16686). Verified directly against the release-1.20 `jaeger.yaml` addon (Services: `tracing`, `zipkin`, `jaeger-collector`; no `jaeger-query`). Fixed to `kubectl port-forward svc/tracing -n istio-system 16686:80` with a clarifying comment.

2. **Wrong hostname in Kiali tracing `in_cluster_url`.** The Kiali config used `http://jaeger-query:16685/jaeger`, referencing the non-existent `jaeger-query` service. The correct in-cluster host is the `tracing` service (which exposes the gRPC query port 16685). Fixed to `http://tracing:16685/jaeger`, matching Kiali's documented default for the Istio addon.

## Review Notes
- The `Kiali` custom resource shown (`kind: Kiali`, `kiali.io/v1alpha1`) is the Kiali *Operator* CRD. It only applies when Kiali is installed via the Kiali Operator. The addon installed earlier in the post (`samples/addons/kiali.yaml`) uses a plain Deployment + ConfigMap, so that CR would have no effect unless the operator is also installed. This is a configuration-method caveat, not a syntax error, so it was left unchanged.
- `istioctl experimental analyze` still works but `analyze` graduated out of experimental long ago; `istioctl analyze` (used elsewhere in the post) is the preferred current form. Both are valid, so no change made.
- `telemetry.istio.io/v1alpha1` is correct for Istio 1.20. Newer Istio releases (1.22+) also offer the stable `v1` Telemetry API; readers on much newer Istio may prefer `v1`. The `tracing`, `randomSamplingPercentage`, `providers`, and `customTags` (literal/header/environment) fields are all valid.
- Prometheus metric names (`istio_request_duration_milliseconds_bucket`, `istio_requests_total`), the `reporter="destination"` label, and the `histogram_quantile` PromQL queries are accurate.
- Tracing headers listed (B3 `x-b3-*`, W3C `traceparent`/`tracestate`, Jaeger `uber-trace-id`, `x-request-id`, `x-envoy-force-trace`) are all correct, as is the guidance that applications must propagate them.
- Deployment names used in `kubectl rollout status` (`kiali`, `jaeger`, `prometheus`) match the addon manifests; the `prometheus` pod showing `2/2` (server + configmap-reload sidecar) is accurate.
