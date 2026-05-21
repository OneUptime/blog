# Validation Summary: How to Monitor Canary Deployment Health in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Prometheus and PromQL
- Grafana
- Kiali
- Jaeger / Zipkin tracing
- Flagger

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Kiali integration docs: https://istio.io/latest/docs/ops/integrations/kiali/
- Kiali Topology / Graph docs: https://kiali.io/docs/features/topology/
- Istio Jaeger tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/jaeger/
- Istio distributed tracing with Telemetry API docs: https://istio.io/latest/docs/tasks/observability/distributed-tracing/telemetry-api/
- Flagger Monitoring docs: https://docs.flagger.app/main/usage/monitoring
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes Field Selectors docs: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Prometheus Querying Functions docs: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Querying Operators docs: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The post said Istio generates "four categories" of canary health metrics, but the listed Istio standard service metrics are grouped as HTTP/HTTP2/gRPC request metrics and TCP metrics. Changed this to "HTTP and TCP metrics."
- The Flagger metric example used `flagger_canary_weight{name=...}`, but Flagger documents `flagger_canary_weight` with a `workload` label and `namespace` label. Updated the selector to use `workload`.
- The Flagger status mapping was incorrect. Flagger documents `flagger_canary_status` as 0=running, 1=successful, 2=failed. Updated the comment.
- The Flagger duration example used `flagger_canary_duration_seconds` as if it were a direct series, but Flagger exposes it as a histogram with `_bucket`, `_sum`, and `_count` series. Replaced it with a valid average duration query using `_sum / _count`.
- The real-time sidecar command referred to `deploy/web-app-v1` in a `my-app` canary article and called the output a "success rate check" while grepping `upstream_rq_5xx`. Updated it to target `deploy/my-app-v2` and describe it as an Envoy 5xx counter check.
- The tracing section implied destination version is always available as a trace filter. Istio supports custom trace tags, while `node_id` appears in documented trace output. Updated the sentence to say destination-version filtering requires a custom tag.

## Review Notes
- The PromQL examples use classic histogram buckets correctly by preserving the `le` label for `histogram_quantile`.
- The success-rate examples define success as non-5xx responses, which is consistent with Flagger's documented request-success-rate behavior.
- The Kiali and `istioctl dashboard` commands are valid, assuming the relevant addons or integrations are installed in the cluster.
