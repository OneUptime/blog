# Validation Summary: How to Use OTTL Converter Functions for Advanced Telemetry Manipulation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Transformation Language (OTTL)
- Transform processor
- OTTL converter functions
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Collector Transform Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OTTL common functions documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/ottlfuncs
- OTTL span context path documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottlspan
- OTTL log context path documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottllog
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/

## Issues Found
- The post described `TraceID()` and `SpanID()` as zero-argument string extractors. Current OTTL documents these as converters that create pdata ID values from bytes or hex strings. I changed the ID extraction examples to use `span.trace_id.string`, `span.span_id.string`, `log.trace_id.string`, and `log.span_id.string`.
- The log ID examples incorrectly used span-context paths after the ID-access update. I corrected them to `log.*` paths and used the documented empty-ID comparisons with `TraceID(0x00000000000000000000000000000000)` and `SpanID(0x0000000000000000)`.
- Several examples used unprefixed span paths such as `attributes`, `name`, and `status.code`. I updated the examples to the current documented path style, such as `span.attributes`, `span.name`, and `span.status.code`.
- One YAML statement containing the OTTL string delimiter `": "` did not parse as an unquoted YAML scalar. I wrapped that statement in single quotes so the configuration parses correctly.
- The status-code comparison used the numeric value `2`. I changed it to the documented enum `STATUS_CODE_ERROR` for clarity and compatibility with current OTTL examples.

## Review Notes
The snippets were checked for YAML parseability after edits. The post does not pin an OpenTelemetry Collector version; the review used the current transform processor documentation for version `0.120.0` and later.
