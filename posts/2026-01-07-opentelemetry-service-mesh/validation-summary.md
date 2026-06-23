# Validation Summary: How to Integrate OpenTelemetry with Service Mesh (Istio, Linkerd)

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- OpenTelemetry SDKs and Collector
- Istio service mesh and Telemetry API
- Linkerd service mesh tracing
- Kubernetes manifests and CLI commands
- Python Flask instrumentation
- Node.js OpenTelemetry instrumentation
- Go net/http OpenTelemetry instrumentation
- W3C Trace Context and B3 propagation

## Sources Consulted
- Istio OpenTelemetry tracing documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio Telemetry API task and reference: https://istio.io/latest/docs/tasks/observability/distributed-tracing/telemetry-api/ and https://istio.io/latest/docs/reference/config/telemetry/
- Linkerd distributed tracing documentation: https://linkerd.io/2-edge/tasks/distributed-tracing/
- Linkerd Jaeger extension migration notice: https://linkerd.io/2-edge/tasks/jaeger-extension-migration/
- OpenTelemetry JavaScript resources and exporter documentation: https://opentelemetry.io/docs/languages/js/resources/ and https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry Go otelhttp package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector spanmetrics connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/

## Issues Found
- The Istio `IstioOperator` snippet was described as a ConfigMap and applied with `kubectl apply`. Changed the description and command to use `istioctl install -f ... --skip-confirmation`, matching Istio's installation model for MeshConfig changes.
- The Istio tracing setup used an `EnvoyFilter` with invalid/fragile tracing fields for header propagation. Replaced it with a supported `telemetry.istio.io/v1` `Telemetry` resource for provider selection, sampling, and custom tags.
- The Linkerd section used the deprecated/removed `linkerd jaeger install` flow and old tracing annotations. Updated it to the current `proxy.tracing.*` configuration that exports proxy spans to an OTLP-capable collector, and removed obsolete per-namespace/pod trace collector annotations.
- The Linkerd examples referred to old `l5d-ctx-*` trace headers as propagation headers. Updated the examples to use W3C Trace Context and B3 headers, with Linkerd identity headers treated only as optional correlation metadata.
- The Node.js OpenTelemetry example used older resource construction APIs. Updated it to use `resourceFromAttributes` and current semantic convention constants for service attributes.
- The Go middleware tried to set attributes before the `otelhttp` server span existed. Reordered the handler wrapping and changed the middleware to use the span from the instrumented request context.
- The collector correlation example defined a `spanmetrics` connector but did not export traces to it. Added `spanmetrics` to the traces pipeline exporters so the metrics pipeline can receive derived metrics.
- Updated collector environment variable substitution examples from legacy `${VAR}` style to `${env:VAR}`.
- Updated Istio sampling examples from `telemetry.istio.io/v1alpha1` to `telemetry.istio.io/v1`.

## Review Notes
The post is validated after corrections. Some examples still assume supporting services such as Jaeger, Tempo, Prometheus, and the OpenTelemetry Collector service accounts already exist in the target cluster; that is acceptable for a tutorial but should be made explicit in a future deployment-focused revision.
