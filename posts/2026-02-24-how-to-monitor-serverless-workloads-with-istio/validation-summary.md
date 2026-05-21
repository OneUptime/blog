# Validation Summary: How to Monitor Serverless Workloads with Istio

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Istio
- Kubernetes
- Serverless workloads on Kubernetes
- Prometheus and Prometheus Operator
- kube-prometheus-stack
- Grafana
- Kiali
- Jaeger
- Envoy sidecars
- PromQL
- Go net/http

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio Grafana integration: https://istio.io/latest/docs/ops/integrations/grafana/
- Istio Kiali / Visualizing Your Mesh: https://istio.io/latest/docs/tasks/observability/kiali/
- Istio Jaeger tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/jaeger/
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio distributed tracing FAQ: https://istio.io/latest/about/faq/distributed-tracing/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Prometheus Operator API reference for PodMonitor and PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes raw manifest URL checks for Istio 1.30 sample addons:
  - https://raw.githubusercontent.com/istio/istio/release-1.30/samples/addons/prometheus.yaml
  - https://raw.githubusercontent.com/istio/istio/release-1.30/samples/addons/grafana.yaml
  - https://raw.githubusercontent.com/istio/istio/release-1.30/samples/addons/kiali.yaml
  - https://raw.githubusercontent.com/istio/istio/release-1.30/samples/addons/jaeger.yaml

## Issues Found
- The introduction claimed that the sidecar proxy often outlives the application container and therefore captures metrics even for functions that immediately scale to zero. This overstates Istio's behavior for pod-scoped sidecars and ignores Prometheus's pull model, so I changed it to say that Istio captures traffic while the pod is running and that very short-lived pods can still be missed between scrape intervals.
- The Istio addon manifest URLs used the old `release-1.20` branch. I updated them to `release-1.30`, matching the current Istio documentation and verified that the raw URLs return successfully.
- The PodMonitor example did not specify a port, which can prevent target discovery. I added `port: http-envoy-prom`, matching Istio's documented Envoy metrics scrape port naming pattern, and clarified that PodMonitor labels must match the Prometheus `podMonitorSelector`.
- The tracing section installed Jaeger but did not configure Istio to send traces to the Jaeger collector. I added the IstioOperator extension provider and Telemetry resource configuration from the current Istio Jaeger tracing workflow.
- The tracing section said Istio generates spans for every request. I changed this to sampled requests, because Istio tracing is controlled by the configured sampling rate.
- The tracing header list only included B3 headers. I added `traceparent`, `tracestate`, and `b3` because Istio's current tracing documentation recommends W3C trace context headers for all applications and includes single-header B3 for Zipkin-compatible propagation.
- The Go header propagation example ignored request creation and client errors and did not close the response body. I added basic error handling and `defer resp.Body.Close()`.

## Review Notes
- The Istio sample addons are intended for quick-start and demonstration use, not production-grade monitoring deployments.
- The PromQL examples are valid for Istio standard metrics, but production dashboards should usually include namespace, reporter, and service filters to avoid accidentally aggregating duplicate source and destination reports.
