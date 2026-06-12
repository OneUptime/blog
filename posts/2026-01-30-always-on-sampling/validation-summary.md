# Validation Summary: How to Implement Always-On Sampling

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry tracing and sampling
- OpenTelemetry JavaScript SDK for Node.js
- OpenTelemetry Python SDK
- OpenTelemetry Go SDK
- OpenTelemetry Collector, processors, connectors, and OTLP exporters
- Prometheus alerting and PromQL

## Sources Consulted
- OpenTelemetry JavaScript NodeSDK documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry JavaScript resource documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry sampling concepts: https://opentelemetry.io/docs/concepts/sampling/
- OpenTelemetry trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry Python sampling API documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.sampling.html
- OpenTelemetry Go OTLP HTTP trace exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp
- OpenTelemetry Go semantic conventions documentation: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.37.0
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector routing connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector routing processor documentation and deprecation notice: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/routingprocessor
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector memory limiter processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md

## Issues Found
- The JavaScript examples used `new Resource(...)` from `@opentelemetry/resources`, which is no longer the current public resource creation pattern. Updated the examples to use `resourceFromAttributes(...)`.
- The JavaScript examples used older semantic convention constants, including `deployment.environment`. Updated them to current constants such as `ATTR_SERVICE_NAME`, `ATTR_SERVICE_VERSION`, and `ATTR_DEPLOYMENT_ENVIRONMENT_NAME`.
- The JavaScript NodeSDK examples used the deprecated `spanProcessor` option. Updated them to use `spanProcessors`.
- The storage tiering Collector example configured a routing processor but did not enable routing in the service pipeline, so the snippet would export all traces to both exporters. Replaced it with the current routing connector pattern and explicit input, hot, and warm trace pipelines.
- The Go example passed a full endpoint URL to `otlptracehttp.WithEndpoint`, but that option expects only host and port. Updated it to use `WithEndpointURL` with `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`.
- The Go example used an older semantic convention package and `deployment.environment`. Updated it to `semconv/v1.37.0` and the current `deployment.environment.name` resource attribute.

## Review Notes
- The updated JavaScript snippets were type-checked against current OpenTelemetry npm packages.
- Python OpenTelemetry imports were verified locally against the installed OpenTelemetry Python packages.
- No OpenTelemetry Collector binary was available locally, so Collector YAML was reviewed against official component documentation rather than validated with `otelcol --config`.
