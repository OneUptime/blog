# Validation Summary: How to Use API Gateway Observability with Prometheus and Distributed Tracing

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Prometheus Operator and kube-prometheus-stack
- Prometheus and PromQL
- Grafana dashboards
- Kong Gateway, Kong Ingress Controller, Prometheus plugin, Zipkin plugin, and StatsD plugin
- Apache APISIX Ingress Controller, Prometheus plugin, and Zipkin plugin
- Ambassador / Emissary TracingService
- Jaeger Operator and Jaeger UI
- Alertmanager

## Sources Consulted
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Kong Prometheus plugin documentation: https://developer.konghq.com/plugins/prometheus/
- Kong Prometheus plugin configuration reference: https://developer.konghq.com/plugins/prometheus/reference/
- Kong Zipkin plugin documentation and propagation examples: https://developer.konghq.com/plugins/zipkin/ and https://developer.konghq.com/plugins/zipkin/examples/extract-clear-inject/
- Kong StatsD plugin documentation: https://developer.konghq.com/plugins/statsd/
- Kong Ingress Controller custom resource documentation: https://docs.konghq.com/kubernetes-ingress-controller/latest/reference/custom-resources/
- Apache APISIX Ingress Controller ApisixClusterConfig documentation: https://apisix.apache.org/docs/ingress-controller/1.6.1/concepts/apisix_cluster_config/
- Apache APISIX Prometheus plugin documentation: https://apisix.apache.org/docs/apisix/plugins/prometheus/
- Apache APISIX Zipkin plugin documentation: https://apisix.apache.org/docs/apisix/plugins/zipkin
- Emissary / Ambassador TracingService documentation: https://emissary-ingress.dev/docs/3.8/topics/running/services/tracing-service/
- Jaeger Operator documentation: https://www.jaegertracing.io/docs/1.76/deployment/operator/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/

## Issues Found
- The PromQL examples used generic metric names such as `http_requests_total`, `http_request_duration_seconds_bucket`, `request_size_bytes_bucket`, and `upstream_health_check_success`, which do not match the Kong Prometheus plugin configured earlier in the post. Updated the examples, dashboard expressions, alert rules, and SLO rules to use documented Kong metrics such as `kong_http_requests_total`, `kong_request_latency_ms_bucket`, `kong_bandwidth_bytes`, and `kong_upstream_target_health`.
- The Grafana ConfigMap embedded a dashboard under a `dashboard` wrapper, which is suitable for some import APIs but not for a dashboard JSON file loaded from a ConfigMap sidecar. Changed the JSON to use the dashboard model fields at the root and added `schemaVersion`.
- The Jaeger Operator install URL used `v1.50.0`, which is not a valid released operator manifest URL. Updated it to the documented `v1.76.0` operator manifest URL.
- The Kong Zipkin example used deprecated `header_type` / `default_header_type` propagation settings. Replaced them with the current `propagation.extract`, `propagation.inject`, and `propagation.default_format` configuration.
- The Ambassador section was labeled as OpenTelemetry while the YAML configures the Zipkin driver. Renamed the section and introductory sentence to describe Zipkin-compatible tracing.
- The high latency alert compared a millisecond histogram against a seconds threshold and described the result as seconds. Updated the threshold to `2000` milliseconds and the annotation to report milliseconds.
- The Alertmanager child route used the older `match` map form. Updated it to the current `matchers` list syntax.
- The StatsD section showed Lua code requiring `kong.plugins.statsd`, which is not a supported way to emit metrics from Kong. Replaced it with a documented Kong StatsD plugin configuration.
- The latency SLO recording rule used a boolean percentile comparison rather than a ratio of requests meeting the threshold. Replaced it with a bucket/count ratio for requests under 500ms.

## Review Notes
- Jaeger v2 is the current Jaeger line, but the post's gateway examples use Zipkin-compatible ingestion and the Jaeger v1 Operator CRD. The corrected operator example is valid for Jaeger 1.x; a future rewrite could migrate the tracing deployment to Jaeger v2 and the OpenTelemetry Operator.
- The PromQL examples are now Kong-specific. The APISIX and Ambassador sections remain useful setup examples, but their dashboards and alerts should use each gateway's own metric names if readers choose those gateways instead of Kong.
