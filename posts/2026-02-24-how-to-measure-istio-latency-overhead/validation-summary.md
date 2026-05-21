# Validation Summary: How to Measure Istio Latency Overhead

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Istio sidecar service mesh
- Envoy access logs and tracing
- Fortio load testing
- Kubernetes Deployments, Services, namespaces, and kubectl
- Prometheus histogram queries
- Grafana dashboard queries

## Sources Consulted
- Istio Envoy access logs: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio trace sampling configuration: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio Jaeger tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/jaeger/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy access log substitution formatter: https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter
- Envoy router filter headers: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html
- Fortio README and CLI flag reference: https://github.com/fortio/fortio
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Prometheus histogram_quantile reference: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile

## Issues Found
- The post said a request went through "four proxy hops" but listed five latency components. Changed the wording to "five main latency components" to match the list.
- The benchmark commands used `deploy/fortio-client`, but the sample manifests only deployed `echo-server`. Added a minimal Fortio client Deployment so the commands have a valid target.
- The access log explanation treated `X-ENVOY-UPSTREAM-SERVICE-TIME` as only upstream response time and implied subtracting it from `%DURATION%` exactly equals Envoy processing time. Updated the text to match Envoy's definition and call the subtraction an approximation.
- The tracing snippet used an incomplete MeshConfig-only example. Replaced it with current `telemetry.istio.io/v1` sampling configuration and noted that a tracing extension provider and header propagation are still required.
- The Jaeger dashboard command used the old `svc/tracing` port-forward pattern. Updated it to `istioctl dashboard jaeger`, which matches current Istio docs.
- The mTLS comparison used `security.istio.io/v1beta1` and created separate namespace-wide PeerAuthentication resources for STRICT and DISABLE. Updated to `security.istio.io/v1`, reused the same `default` resource name, and added matching `DestinationRule` TLS modes so outbound TLS behavior is explicit.

## Review Notes
The Prometheus percentile subtraction examples are syntactically valid, but subtracting independently estimated percentiles is only an approximation. The post already frames those comparisons as rough measurements.
