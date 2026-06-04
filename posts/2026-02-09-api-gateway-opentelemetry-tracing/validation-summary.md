# Validation Summary: How to Deploy API Gateway with OpenTelemetry Instrumentation for Tracing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry tracing and W3C Trace Context
- OpenTelemetry Collector
- NGINX OpenTelemetry module
- Envoy OpenTelemetry tracer
- Istio Telemetry API
- Kong OpenTelemetry plugin
- Prometheus alerting and Collector internal metrics
- Jaeger query API

## Sources Consulted
- OpenTelemetry Collector exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector releases: https://github.com/open-telemetry/opentelemetry-collector-releases
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- NGINX ngx_otel_module reference: https://nginx.org/en/docs/ngx_otel_module.html
- NGINX OpenTelemetry dynamic module documentation: https://docs.nginx.com/nginx/admin-guide/dynamic-modules/opentelemetry/
- Envoy OpenTelemetry tracer API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/trace/v3/opentelemetry.proto.html
- Envoy HTTP connection manager tracing API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto.html
- Envoy custom tracing tag API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/type/tracing/v3/custom_tag.proto.html
- Istio trace sampling documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Kong OpenTelemetry plugin reference and schema: https://developer.konghq.com/plugins/opentelemetry/reference/ and https://raw.githubusercontent.com/Kong/kong/master/kong/plugins/opentelemetry/schema.lua

## Issues Found
- Clarified gateway span creation. The post said API gateways create root spans for the entire lifecycle; this is only true for new traces. Updated the wording to explain that gateways create or continue server spans depending on incoming trace context.
- Replaced the deprecated OpenTelemetry Collector `logging` exporter and `loglevel` option with the current `debug` exporter and `verbosity` option.
- Updated the Collector image from `otel/opentelemetry-collector:0.91.0` to `otel/opentelemetry-collector:0.153.0`, the latest official release available during review.
- Replaced the invalid NGINX module download URL with installation of the packaged `nginx-module-otel` dynamic module and updated the NGINX base version.
- Corrected Envoy wording: the OpenTelemetry tracer exists, but Envoy still documents it as work-in-progress rather than broadly production-complete.
- Replaced deprecated Envoy router `start_child_span` usage with `spawn_upstream_span` in the HTTP connection manager tracing block.
- Updated the Istio Telemetry resource API version from `telemetry.istio.io/v1alpha1` to `telemetry.istio.io/v1`.
- Updated Kong plugin configuration to use `traces_endpoint` instead of deprecated `endpoint`, and `queue.max_batch_size` / `queue.max_coalescing_delay` instead of deprecated batch settings.
- Changed the Kong Admin API command to use JSON so resource attribute keys such as `service.name` are represented correctly.
- Replaced an Envoy route metadata example that did not add span attributes with a current `tracing.custom_tags` example.
- Corrected Collector monitoring examples from nonexistent or misleading metrics to current receiver refused and exporter send-failure metrics, and renamed the batch metric description from pipeline latency to batch send size.

## Review Notes
Some examples remain illustrative and assume surrounding infrastructure exists, such as a Jaeger deployment that accepts OTLP on port 4317, NGINX package repositories available in the image build environment, and Collector internal metrics exposed with Prometheus naming conventions.
