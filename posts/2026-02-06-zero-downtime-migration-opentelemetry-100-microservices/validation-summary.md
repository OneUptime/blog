# Validation Summary: How to Plan a Zero-Downtime Migration to OpenTelemetry for 100+ Microservices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Java SDK
- OTLP
- Jaeger receiver and propagation
- StatsD receiver
- Tail-based sampling
- W3C Trace Context and Baggage
- B3 propagation
- Kubernetes collector deployment patterns

## Sources Consulted
- OpenTelemetry Collector OTLP receiver documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector Jaeger receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/jaegerreceiver/README.md
- OpenTelemetry Collector StatsD receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/statsdreceiver/README.md
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector agent-to-gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/other/agent-to-gateway/
- OpenTelemetry Collector gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/gateway/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Java SDK documentation: https://opentelemetry.io/docs/languages/java/sdk/
- OpenTelemetry propagators specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- B3Propagator Java API documentation: https://javadoc.io/doc/io.opentelemetry/opentelemetry-extension-trace-propagators/latest/io/opentelemetry/extension/trace/propagation/B3Propagator.html

## Issues Found
- The Collector gateway text described tail sampling behind a generic load balancer without noting trace affinity. Updated it to state that all spans for the same trace must reach the same gateway instance, such as with the Collector load-balancing exporter and `routing_key: traceID`.
- The Java SDK example used `Sampler.parentBased(Sampler.alwaysOn())` and claimed it was for gateway tail sampling. Updated it to `Sampler.alwaysOn()` so the SDK exports local spans and leaves the final keep/drop decision to the gateway tail sampler.
- The per-service cleanup checklist said to remove old agent sidecars, which could be read as removing the new OpenTelemetry Collector agent. Changed it to remove legacy agent sidecars.
- The context propagation section said to configure propagation at the Collector agent level. Corrected this because HTTP header extraction and injection happens in service instrumentation, not in the Collector telemetry pipeline.
- The migration dashboard section implied `otelcol_receiver_accepted_spans` can count distinct services by `service_name` per receiver. Corrected it to use Collector receiver metrics for traffic volume and backend `service.name` resource queries or inventory data for service counts.

## Review Notes
The remaining examples are representative snippets and omit imports, dependency declarations, gateway exporter details, and complete tail-sampling policy configuration. That is acceptable for a planning guide, but a future implementation tutorial should include version-pinned dependencies and runnable Collector configs.
