# Validation Summary: How to Choose Between Head-Based and Tail-Based Sampling in OpenTelemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry tracing and sampling
- OpenTelemetry Python SDK
- OpenTelemetry JavaScript/Node.js SDK
- OpenTelemetry Collector
- OpenTelemetry Collector tail sampling processor
- W3C Trace Context
- OTLP exporters

## Sources Consulted
- OpenTelemetry JavaScript sampling documentation: https://opentelemetry.io/docs/languages/js/sampling/
- OpenTelemetry JavaScript instrumentation and resource setup documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript resources API reference: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry Python sampling API documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/trace.sampling.html
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry Collector tail sampling blog and configuration example: https://opentelemetry.io/blog/2022/tail-sampling/
- OpenTelemetry Collector tail sampling sample configuration: https://opentelemetry.io/docs/demo/sample-configurations/tail-sampling-service-criticality/
- OpenTelemetry Collector processor list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector gateway deployment pattern and load-balancing exporter guidance: https://opentelemetry.io/docs/collector/deploy/gateway/
- OpenTelemetry Collector contrib tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- W3C Trace Context recommendation: https://www.w3.org/TR/trace-context/

## Issues Found
- The Python example imported `TraceIdRatioBased` but did not use it. Removed the unused import while keeping the documented `ParentBasedTraceIdRatio` sampler.
- The Node.js example used `new Resource(...)` from `@opentelemetry/resources`. Current OpenTelemetry JavaScript documentation uses `resourceFromAttributes(...)`, so the example was updated to use that helper.
- The tail-sampling explanation implied that the Collector detects trace completion. The Collector makes decisions after `decision_wait`, so the text and Mermaid diagram were updated to describe the configured wait period instead.
- The post described error and latency capture as guaranteed. Tail sampling depends on spans reaching the same tail-sampling processor and arriving before the decision, so the trade-off matrix and conclusion were revised to describe policy-based capture with those conditions.
- The head-sampling completeness claim was too absolute. It now notes that completeness depends on participating services propagating context and respecting the parent sampling decision.

## Review Notes
The Python and JavaScript snippets were checked for syntax, and the Collector YAML snippets were parsed successfully. Runtime execution was not performed because the repository does not include the OpenTelemetry SDK and Collector dependencies.
