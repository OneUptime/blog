# Validation Summary: How to Configure Trace Span Tags in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Telemetry API
- Istio MeshConfig and IstioOperator
- Istio sidecar proxy configuration
- Envoy distributed tracing
- Kubernetes Deployment manifests
- Istio VirtualService header manipulation
- Jaeger and Zipkin trace backends

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Telemetry API task guide: https://istio.io/latest/docs/tasks/observability/telemetry/
- Istio tracing with Telemetry API: https://istio.io/latest/docs/tasks/observability/distributed-tracing/telemetry-api/
- Istio tracing with MeshConfig and pod annotations: https://istio.io/latest/docs/tasks/observability/distributed-tracing/mesh-and-proxy-config/
- Istio trace sampling precedence: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Envoy tracing architecture overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/observability/tracing.html
- Envoy custom tracing tags API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/type/tracing/v3/custom_tag.proto.html

## Issues Found
- The post claimed Envoy adds a fixed list of exact tags to every span. Envoy documents common span data, but exact tag names vary by tracer and exporter. I changed the wording to describe the list as common metadata rather than guaranteed universal tags.
- The Telemetry API example used `POD_NAME` as an environment custom tag, then the environment-variable section incorrectly implied the sidecar inherits application container environment variables. The pod annotation example had the same issue with `BUILD_HASH`. Istio documents environment custom tags as values from the workload proxy environment. I changed the examples to use proxy environment values configured through `proxyMetadata`.
- The MeshConfig and `proxy.istio.io/config` examples used `customTags`, which is correct for the Telemetry API but not for the legacy proxy tracing schema. Istio's MeshConfig and pod annotation docs use `custom_tags`, so I corrected those snippets.
- The multi-tenant VirtualService example said the gateway or frontend should set the tenant header, but the snippet only matched an existing header. I changed the example to use `headers.request.set`, which is the documented Istio way to add a request header in a VirtualService route.

## Review Notes
The Telemetry API is the preferred current API for tracing configuration. Istio still documents MeshConfig and `proxy.istio.io/config` for tracing, but those examples use the proxy tracing schema and usually require workload restarts to take effect.
