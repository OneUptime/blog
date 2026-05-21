# Validation Summary: How to Set Up Custom Providers with Telemetry API in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Telemetry API
- Istio MeshConfig extension providers
- Envoy access logging and Access Log Service
- OpenTelemetry Collector
- OTLP and Zipkin tracing
- Kubernetes manifests and kubectl commands

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Telemetry API task documentation: https://istio.io/latest/docs/tasks/observability/telemetry/
- Istio MeshConfig / extension provider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio access logs with Telemetry API: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio OpenTelemetry tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio tracing with Telemetry API task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/telemetry-api/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Contrib repository and releases: https://github.com/open-telemetry/opentelemetry-collector-contrib

## Issues Found
1. **Default provider wording was inaccurate.** The post described Zipkin as an Istio built-in telemetry provider and implied custom providers existed for every telemetry type, including OpenTelemetry metrics. Current Istio documentation lists built-in defaults such as Prometheus for metrics and Envoy for access logging, while tracing providers are configured through MeshConfig extension providers. Updated the wording to avoid implying a built-in Zipkin provider or an OpenTelemetry metrics provider in Telemetry API.

2. **Custom gRPC ALS example used the wrong provider type.** The post used `envoyExtAuthzGrpc`, which configures Envoy external authorization, not an access log service provider. Changed it to `envoyHttpAls`, which is the MeshConfig provider type for Envoy HTTP gRPC Access Log Service.

3. **Multiple tracing backend example overstated Istio support.** The post claimed Istio could send different sampling rates to multiple tracing providers simultaneously from one Telemetry resource. Istio's Telemetry API reference states only one provider can be specified in a tracing rule. Replaced the example with the recommended fan-out pattern: send traces to an OpenTelemetry Collector, then configure multiple exporters there.

4. **Collector deployment was missing the namespace it referenced.** The Kubernetes manifests used `namespace: observability` without creating it. Added a `Namespace` manifest at the start of the collector setup.

5. **Collector image version was stale.** The post used `otel/opentelemetry-collector-contrib:0.93.0`. Updated it to `0.152.0`, a current OpenTelemetry Collector Contrib release as of the review date.

## Review Notes
The remaining examples are configuration fragments intended to be placed under `meshConfig.extensionProviders`, so they are not standalone Kubernetes manifests by themselves. The `curl` connectivity check against OTLP/gRPC port 4317 is useful for detecting connection refusal, but a successful HTTP response should not be expected because OTLP/gRPC is not an HTTP/1.1 endpoint.
