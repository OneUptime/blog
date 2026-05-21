# Validation Summary: How to Troubleshoot Istio Observability Problems

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Istio
- Envoy sidecars
- Kubernetes and kubectl
- Prometheus
- Istio Telemetry API
- Distributed tracing and trace context propagation
- Jaeger and Zipkin
- Grafana
- Kiali

## Sources Consulted
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Telemetry API task documentation: https://istio.io/latest/docs/tasks/observability/telemetry/
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio trace sampling documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Envoy access log documentation: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio custom metrics documentation: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- Kiali Prometheus configuration documentation: https://kiali.io/docs/configuration/p8s-jaeger-grafana/prometheus/
- Kiali CR reference: https://kiali.io/docs/configuration/kialis.kiali.io/

## Issues Found
- The post stated that the Istio sidecar should automatically add Prometheus scrape annotations without qualification. Istio documents this behavior for Prometheus metrics merging, so the wording was updated to make that condition explicit and mention other valid causes when annotations are absent.
- The trace header check used `kubectl exec` against the `istio-proxy` container and ran `curl` from there. Envoy proxy images should not be assumed to include curl, so the example now runs from an application container or curl/debug pod.
- The sampling section focused on editing `MeshConfig` through the `istio` ConfigMap with `sed`. Current Istio documentation recommends configuring sampling with the Telemetry API, so the examples were changed to use `randomSamplingPercentage`.
- The Kiali configuration check looked for `prometheus_url` in a ConfigMap. Current Kiali documentation describes Prometheus configuration under `.spec.external_services.prometheus.url` in the Kiali CR when using the Kiali Operator, so the command was updated.

## Review Notes
The remaining commands and configuration snippets are broadly accurate for a sidecar-based Istio installation. Some service names such as `prometheus`, `jaeger-query`, `zipkin`, `grafana`, and `kiali` can vary by installation method, but the post presents them as common examples rather than universal names.
