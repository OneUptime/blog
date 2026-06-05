# Validation Summary: How to Use Declarative Configuration to Define Attribute Limits, Span Limits,

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry SDK declarative configuration
- OpenTelemetry attribute limits
- OpenTelemetry span limits
- OpenTelemetry log record limits
- OpenTelemetry metric views and cardinality control
- OTLP gRPC exporters

## Sources Consulted
- OpenTelemetry Declarative Configuration documentation: https://opentelemetry.io/docs/languages/sdk-configuration/declarative-configuration/
- OpenTelemetry Configuration Types Reference: https://opentelemetry.io/docs/specs/otel/configuration/types/
- OpenTelemetry Common Specification, Attribute Limits: https://opentelemetry.io/docs/specs/otel/common/#attribute-limits
- OpenTelemetry SDK Environment Variable Specification, Batch Processor and Limit settings: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Metrics SDK specification, metric attribute-limit exemption and views/cardinality behavior: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry SDK metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/otel/sdk-metrics/
- OpenTelemetry configuration kitchen-sink example: https://github.com/open-telemetry/opentelemetry-configuration/blob/v1.0.0-rc.1/examples/kitchen-sink.yaml

## Issues Found
1. **Outdated declarative configuration version**: The post used `file_format: "0.3"`. Current OpenTelemetry declarative configuration documentation uses the stable `file_format: "1.0"`. Updated all examples to `1.0`.
2. **Incorrect scope for general attribute limits**: The post said attribute limits apply to span, metric data point, or log record attributes. OpenTelemetry currently exempts metric attributes from the common attribute-limit rules. Updated the wording to cover spans and log records, with metric cardinality handled through views.
3. **Log body limit implication was inaccurate**: The post used a 5MB log body as an example of what these limits protect. OpenTelemetry attribute limits do not apply to `LogRecord.Body`; they apply to attribute collections. Changed the example to a large log attribute value.
4. **Attribute limit behavior was incomplete**: The post said additional attributes are silently dropped. Count limits discard additional attributes, while value length limits truncate string and byte-array values. Updated the explanation.
5. **Declarative schema examples used outdated/invalid shapes**: Updated resource attributes from a map to the current list of `{name, value}` entries, OTLP exporter blocks from `otlp` plus `protocol: "grpc"` to `otlp_grpc`, propagators from a string list to keyed composite entries, and metric view `attribute_keys` to use `included`.
6. **Monitoring metrics were not official**: The post listed `otel.sdk.span.attributes_dropped`, `otel.sdk.span.events_dropped`, and `otel.sdk.span.links_dropped` as SDK metrics. These are not the current official SDK internal metric names. Replaced them with dropped-count fields exposed in exported telemetry/backend metadata and noted that SDKs may emit internal logs for discarded data.

## Review Notes
Declarative configuration support remains implementation-dependent even though the schema is stable; the OpenTelemetry documentation currently lists Java as the supported SDK. YAML snippets were parsed locally after editing.
