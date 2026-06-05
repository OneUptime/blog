# Validation Summary: How to Build a Zero Trust Network Monitoring Dashboard with OpenTelemetry

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Collector
- OpenTelemetry Transformation Language (OTTL)
- Istio
- Envoy service mesh telemetry
- Prometheus / PromQL
- Go OpenTelemetry instrumentation
- Zero trust networking concepts

## Sources Consulted
- Istio OpenTelemetry tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio MeshConfig extension provider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio gateway network topology and X-Forwarded-Client-Cert documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/network-topologies/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor
- OpenTelemetry Go API package documentation: https://pkg.go.dev/go.opentelemetry.io/otel

## Issues Found
- The post claimed Istio 1.20+ exports telemetry in OpenTelemetry format and configured an OpenTelemetry provider as both tracing and metrics provider. Istio's OpenTelemetry extension provider is a tracing provider, while standard request metrics are Prometheus metrics. Updated the section to say Istio 1.16.1+ supports OTLP trace export, removed the invalid metrics default provider, enabled tracing with `enableTracing: true`, and clarified that metrics are scraped by the Collector.
- The Collector transform processor example used ambiguous `attributes[...]` paths. Updated the OTTL statements to use current explicit `datapoint.attributes[...]` and `span.attributes[...]` paths and added `error_mode: ignore`.
- The trace transform attempted to copy `upstream_peer.spiffe_id` and `downstream_peer.spiffe_id`, which are not documented Istio proxy span attributes. Replaced that with a documented proxy-span classification based on the `component` span attribute shown in Istio's OpenTelemetry tracing output.
- The Go example implied the application directly extracts identity from the mTLS certificate. Updated the comment to state that the application reads XFCC appended by the sidecar when XFCC forwarding is configured.
- The mTLS coverage PromQL did not filter `reporter="destination"`, even though Istio documents `connection_security_policy` as reliable for destination-reported metrics and `unknown` for source reports. Updated the mTLS and authorization-denial queries to use destination-reported request metrics.

## Review Notes
The post is now accurate for Istio sidecar-mode telemetry and OpenTelemetry Collector processing. Future improvements could add a concrete `Telemetry` resource for sampling/provider selection and a production-ready XFCC parsing example, but those are enhancements rather than correctness blockers.
