# Validation Summary: How to Use Conditional Attribute Copying with OTTL Where Clauses Based

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Transformation Language (OTTL)
- Transform processor
- OTLP receiver and exporter configuration
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Collector Contrib transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Contrib OTTL README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/README.md
- OpenTelemetry Collector Contrib OTTL functions reference: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry Collector Contrib span context reference: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottlspan/README.md
- OpenTelemetry Collector transformation overview: https://opentelemetry.io/docs/collector/transforming-telemetry/

## Issues Found
- The examples used the older unprefixed span-context attribute path style, such as `attributes["key"]`, inside `context: span` transform processor groups. Current OpenTelemetry Collector transform processor documentation for version 0.120.0 and later documents prefixed OTTL paths such as `span.attributes["key"]`. I updated span attribute reads, writes, and `delete_key` calls to use `span.attributes`.
- The payment redaction example wrote `"XXXX"` to `card.last_four`, which suggested it was extracting or preserving the actual last four digits. I changed it to set `card.redacted` to `true` before deleting `card.number`, matching the described redaction behavior.
- The performance section advised putting the most common services first in the statement list. Transform processor statements are processed in order, and that ordering does not by itself avoid evaluating later statement conditions. I changed the note to recommend keeping statement lists focused so each span evaluates only the conditions it needs.

## Review Notes
The examples are configuration fragments and may still need to be embedded in a Collector distribution that includes the contrib transform processor. For production use, add explicit `error_mode` settings according to the desired failure behavior and test the resulting Collector configuration with the exact Collector version being deployed.
