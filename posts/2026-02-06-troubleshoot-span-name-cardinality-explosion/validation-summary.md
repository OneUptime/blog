# Validation Summary: How to Troubleshoot Span Name Cardinality Explosion When URL Path Parameters

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry HTTP semantic conventions
- OpenTelemetry Collector transform processor
- OpenTelemetry Collector span processor
- OpenTelemetry Collector debug exporter
- Python Flask instrumentation
- Node.js Express instrumentation
- Java Spring Boot instrumentation

## Sources Consulted
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Flask instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- OpenTelemetry Java HTTP instrumentation configuration: https://opentelemetry.io/docs/zero-code/java/agent/instrumentation/http/
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector span processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/spanprocessor
- OpenTelemetry spanmetrics connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Express instrumentation package documentation: https://app.unpkg.com/@opentelemetry/instrumentation-express@0.44.0/files/README.md
- OpenTelemetry Python span API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html

## Issues Found
- The post originally implied that HTTP auto-instrumentation generally captures raw URL paths as span names. Updated this to clarify that OpenTelemetry semantic conventions require low-cardinality targets when available and forbid defaulting to the URI path, while older, custom, or route-unaware instrumentation can still cause the issue.
- The Java example used `-Dotel.instrumentation.servlet.experimental.capture-request-parameters=false`, but the Java agent option expects a comma-separated list of request parameter names and does not normalize span names. Replaced it with a note explaining that the option captures request parameters as attributes, not route templates.
- The Node.js Express instrumentation example created an HTTP instrumentation hook that did not normalize anything. Replaced it with an Express `spanNameHook` example that uses the matched route when available and avoids naming spans from `request.url`.
- The "Span Processor" section used the attributes processor, which modifies attributes but does not rename spans. Replaced the snippet with a `span/to_attributes` processor example that extracts dynamic path segments and replaces them with named placeholders.
- The manual JavaScript example used the `trace` API without importing it and assumed an active span was always present. Added the `@opentelemetry/api` import and guarded the span update.
- The post referred to degraded performance in the Collector's spanmetrics processor. Updated this to "span-to-metrics components" because the spanmetrics processor has been replaced by the spanmetrics connector in current Collector guidance.

## Review Notes
The post is technically relevant and salvageable. The corrected guidance now aligns with current OpenTelemetry semantic conventions: route templates belong in `http.route` for server spans, client templates use `url.template` where available, and dynamic identifiers should not be used in span names. High-cardinality attributes such as `user.id` may still be acceptable for traces in some backends, but they should not be promoted to metrics dimensions without an explicit cardinality policy.
