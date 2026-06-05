# Validation Summary: How to Use OTTL merge_maps to Combine Resource and Span Attributes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Transformation Language (OTTL)
- Transform processor
- Batch processor
- OTLP receiver and exporter configuration

## Sources Consulted
- OpenTelemetry Collector Contrib OTTL function documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/ottlfuncs
- OpenTelemetry Collector Contrib transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry resource documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry Collector batch processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/batchprocessor

## Issues Found
- The examples used unprefixed paths such as `attributes` and `name` inside `context: span` and `context: log` statement groups. Current transform processor documentation shows the supported path prefixes (`span.attributes`, `span.name`, `log.attributes`, and `resource.attributes`) for trace and log statements. Updated all examples to use the current prefixed OTTL paths.
- The introduction said `merge_maps` can flatten nested attribute structures. Official OTTL documentation describes `merge_maps` as merging a source map into a target map; flattening nested maps is handled by the separate `flatten` function. Removed that claim.
- The resource attribute explanation said resources describe the entity that produced telemetry. OpenTelemetry docs define a resource as the entity for which telemetry is produced, which is more precise. Updated the wording.
- The backend capability note said specific backends can join resource and span attributes at query time. Backend behavior varies, so the statement was changed to the more accurate claim that many backends expose resource attributes alongside span data, making Collector-side merging unnecessary for some query patterns.

## Review Notes
The corrected OTTL `merge_maps` strategies (`insert`, `update`, and `upsert`), Collector pipeline structure, OTLP receiver/exporter shape, and batch processor settings align with the official documentation reviewed.
