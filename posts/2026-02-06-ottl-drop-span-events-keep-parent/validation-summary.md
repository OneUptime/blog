# Validation Summary: Use OTTL to Drop Specific Span Events While Keeping the Parent Span Intact

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Transformation Language (OTTL)
- Filter processor
- Transform processor
- Span events

## Sources Consulted
- OpenTelemetry Collector Contrib filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector Contrib transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Contrib span event OTTL context documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottlspanevent/README.md
- OpenTelemetry Collector Contrib OTTL functions documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry Collector Contrib v0.153.0 `otelcol-contrib validate`

## Issues Found
- The OTTL examples used unprefixed span event paths such as `name`, `attributes`, and `event_index` inside `context: spanevent` blocks. Current Collector documentation exposes these paths as `spanevent.name`, `spanevent.attributes`, and `spanevent.event_index`, so the snippets were updated to use the documented path names.
- The measurement section claimed that exception stack traces commonly account for 60-80% of span data volume. This is workload-specific and not established by the official documentation, so the statement was softened to say that large exception stack traces can account for a large share of span event payload size in some workloads.

## Review Notes
Validated the full configuration and a combined configuration built from the individual snippets with `otelcol-contrib validate` from OpenTelemetry Collector Contrib v0.153.0.
