# Validation Summary: How to Monitor Egress Traffic in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar telemetry
- Istio ServiceEntry
- Istio egress gateway
- Istio Telemetry API
- Envoy access logs
- Prometheus and PromQL
- Prometheus Operator PrometheusRule
- Grafana dashboards
- Kubernetes kubectl
- Jaeger and Zipkin tracing

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Envoy access logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio access logs with Telemetry API task: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio accessing external services task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio egress gateway task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Istio egress TLS origination task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio Jaeger integration: https://istio.io/latest/docs/ops/integrations/jaeger/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post said ServiceEntries provide full HTTP metrics for HTTP/TLS services. This was too broad because Istio cannot inspect HTTP methods, paths, or response codes inside application-originated HTTPS/TLS unless the proxy originates or terminates TLS. Updated the text to distinguish HTTP visibility from TLS/SNI visibility.
- The post described ALLOW_ANY passthrough as only basic TCP metrics. Updated the wording to say passthrough traffic has limited service attribution and HTTP detail depends on protocol detection.
- Several PromQL examples treated every destination outside `default`, `kube-system`, and `istio-system` as external. This is not a reliable way to identify egress traffic because internal services can live in other namespaces and ServiceEntries can live in those excluded namespaces. Updated the examples to assume a dedicated `external-services` namespace for ServiceEntries, include `unknown` for passthrough, and tell readers to adjust the namespace matcher.

## Review Notes
The PrometheusRule example assumes the Prometheus Operator CRDs are installed. The egress gateway examples assume the gateway deployment exists; Istio's default profile does not install the egress gateway by default, while the demo profile does. The PromQL namespace matcher is intentionally an example convention, not a universal egress classifier.
