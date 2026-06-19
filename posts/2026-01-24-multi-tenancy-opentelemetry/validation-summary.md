# Validation Summary: How to Handle Multi-Tenancy in OpenTelemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Python API and SDK
- OpenTelemetry Baggage and context propagation
- OpenTelemetry Collector
- OpenTelemetry Collector routing connector
- OpenTelemetry Collector resource, batch, memory limiter, and probabilistic sampler processors
- OTLP receivers and exporters
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Python tracing API: https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html
- OpenTelemetry Python baggage API: https://opentelemetry-python.readthedocs.io/en/latest/api/baggage.html
- OpenTelemetry Python tracing instrumentation guide: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python SDK trace export API: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector OTLP receiver documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector routing connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector routing processor deprecation notice: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/routingprocessor/README.md
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector resource processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- OpenTelemetry Collector telemetry transformation documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/

## Issues Found
- The post used the deprecated Collector routing processor for tenant routing. Updated the example to use the current routing connector, including connector pipelines and OTTL conditions.
- The Collector metadata extraction example used `from_context: metadata.*` without enabling receiver metadata. Added `include_metadata: true` to the OTLP receiver protocols.
- The tenant header extraction example wrote tenant data with the attributes processor while the routing rules evaluated resource attributes. Changed it to the resource processor so the routing connector evaluates the same attribute location.
- The gateway Collector example attempted to copy `resource.tenant.tier` through the attributes processor. Removed that incorrect processor and routed directly on resource attributes with routing connector `context: resource` conditions.
- The Collector "rate limiting" example actually used probabilistic sampling and duplicated data across tier pipelines because all pipelines shared the same receiver. Renamed it to tenant sampling and added a routing connector so each tier is routed to only the intended sampling pipeline.
- The baggage example extracted an incoming context but read baggage from the implicit current context. Updated `get_tenant_from_baggage` to accept and use the extracted context.
- The span attributes example added tenant attributes before the function-created span existed. Added tenant attributes inside the active `process_request` span.
- The namespace isolation exporter mutated a private span field (`span._name`) on exported spans. Replaced it with a `SpanProcessor` that adds public tenant namespace attributes when spans start.
- The best-practice statement implied tenant data should always be a resource attribute. Adjusted it to distinguish tenant-dedicated resources from request-level tenant context in shared services.

## Review Notes
The examples are illustrative and still use application-specific helper functions such as `get_current_tenant_id`, `get_tenant_tier`, and `process_request`. Python snippets were parsed successfully with `ast`, and YAML snippets were loaded successfully with PyYAML. Collector component availability still depends on the chosen Collector distribution; the routing connector and some processors require a distribution that includes those components, such as `otelcol-contrib`.
