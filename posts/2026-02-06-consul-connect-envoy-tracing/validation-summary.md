# Validation Summary: How to Configure OpenTelemetry Distributed Tracing in Consul Connect Envoy

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Consul Connect / Consul service mesh
- Envoy sidecar proxies
- Envoy distributed tracing configuration
- Envoy OpenTelemetry tracer
- OpenTelemetry Collector
- Kubernetes Service discovery

## Sources Consulted
- HashiCorp Consul distributed tracing documentation: https://developer.hashicorp.com/consul/docs/observe/distributed-tracing
- HashiCorp Consul Envoy proxy configuration reference: https://developer.hashicorp.com/consul/docs/reference/proxy/envoy
- HashiCorp Consul service-defaults configuration entry reference: https://developer.hashicorp.com/consul/docs/connect/config-entries/service-defaults
- Envoy tracing architecture documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/observability/tracing.html
- Envoy HTTP connection manager tracing API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto.html
- Envoy OpenTelemetry tracer API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/trace/v3/opentelemetry.proto.html
- Envoy cluster API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto.html
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md

## Issues Found
- The post presented Envoy's OpenTelemetry tracer as production-ready. Envoy currently documents this tracer as work-in-progress and not intended for production use, and HashiCorp's Consul tracing documentation still recommends supported tracers such as Zipkin. Updated the introduction to make this an experimental setup and avoid overstating production readiness.
- The post implied Consul alone provides complete end-to-end tracing without application changes. HashiCorp documents that applications must propagate trace headers and create application spans for full end-to-end traces. Updated the explanation to distinguish mesh-level proxy spans from application spans.
- The global proxy defaults snippet did not set `protocol = "http"`. Consul only generates tracing for HTTP, HTTP/2, and gRPC service traffic, so the snippet now sets the protocol explicitly.
- The Envoy static collector cluster omitted `connect_timeout`, which is a required and standard Envoy cluster setting. Added `connect_timeout = "3s"` to the JSON cluster.
- The Consul tracing JSON used `typed_config` in `envoy_tracing_json`, while Consul's proto3 JSON examples for this field use `typedConfig`. Updated the `envoy_tracing_json` examples to `typedConfig`.
- The sampling example did not actually configure sampling; setting `envoy_extra_static_listeners_json = ""` has no sampling effect. Replaced it with an `envoy_listener_tracing_json` example using HTTP connection manager `random_sampling` and `overall_sampling` percentages.
- The post omitted the need to restart sidecar proxies after changing bootstrap/listener tracing configuration. Added a restart note after `consul config write`.
- The Envoy config dump verification command only selected top-level objects with `.tracing`, which can miss tracing nested under listeners and HTTP connection managers. Replaced it with a recursive `jq` query.
- The trace-context section stated W3C Trace Context as Envoy's default in general. Envoy propagation depends on the configured tracer, so the text now scopes W3C Trace Context guidance to the OpenTelemetry tracer setup.

## Review Notes
The post is technically relevant and salvageable, but the OpenTelemetry tracer caveat is important: this should be treated as experimental unless Envoy and Consul support status changes in future releases. For production Consul deployments, a future version of this article should consider using HashiCorp's documented Zipkin example or explicitly pinning Envoy and Consul versions tested with OpenTelemetry tracing.
