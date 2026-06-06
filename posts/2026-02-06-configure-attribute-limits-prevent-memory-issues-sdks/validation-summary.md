# Validation Summary: How to Configure Attribute Limits to Prevent Memory Issues in SDKs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry SDK configuration
- OpenTelemetry trace span limits
- OpenTelemetry log record limits
- OpenTelemetry metrics views and cardinality
- Python OpenTelemetry SDK
- Java OpenTelemetry SDK
- Go OpenTelemetry SDK
- OpenTelemetry JavaScript/Node.js SDK
- Kubernetes environment variable configuration

## Sources Consulted
- OpenTelemetry Environment Variable Specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Common Specification, Attribute Limits: https://opentelemetry.io/docs/specs/otel/common/#attribute-limits
- OpenTelemetry Trace SDK Specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry Metrics SDK Specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry SDK Metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/otel/sdk-metrics/
- OpenTelemetry Python SpanLimits documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html
- OpenTelemetry Python environment variables documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/environment_variables.html
- OpenTelemetry Python View documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.view.html
- OpenTelemetry Java SDK configuration documentation: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java SDK SpanLimits documentation: https://opentelemetry.io/docs/languages/java/sdk/#spanlimits
- OpenTelemetry Go SDK trace package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- OpenTelemetry JavaScript SpanLimits documentation: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-node.node.SpanLimits.html

## Issues Found
- The post said common attribute limits applied per metric data point. The OpenTelemetry specs currently exempt metric attributes from the common attribute-count and value-length limits, so the wording was changed to cover spans, span events, span links, and log records.
- The Python `SpanLimits` example used `max_attributes` while describing a span-specific limit. This was changed to `max_span_attributes` to match the intended span-specific configuration.
- The Go example used deprecated `trace.WithSpanLimits`. This was changed to `trace.WithRawSpanLimits`, the current recommended API.
- The post said new events or links are dropped when count limits are exceeded. Some SDKs, including Go, keep the newest event/link and drop the oldest, so the wording was made implementation-aware.
- The environment-variable section said all SDKs respect the variables and that global attribute limits apply to all signals. This was changed to "many SDKs" and scoped to spans, span events, span links, and log records. Missing span/event/link/log-specific variables were added to the Kubernetes snippet.
- The metrics section described metric attribute limits too broadly. It now states that metrics use views, attribute filters, and SDK-specific cardinality limits instead of the common attribute-count/value-length limits.
- The post claimed the specification defines SDK internal counters for dropped attributes. The current SDK metrics semantic conventions define SDK self-telemetry for spans, logs, processors, exporters, and metric readers, but not a standard dropped-attributes counter, so that wording was corrected.
- The debug logging example promised warnings for dropped or truncated attributes. This was softened because logging behavior is implementation-dependent.

## Review Notes
The recommended numeric limits in the post are guidance rather than specification defaults. They are reasonable as starting points, but teams should tune them based on traffic, telemetry volume, exporter queue behavior, and backend cost/cardinality constraints.
