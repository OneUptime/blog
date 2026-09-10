# Validation Summary: Choose the Attributes Processor or OTTL for Simple Enrichment

## Status

validated

## Post Type

Technical tutorial and troubleshooting guide.

## Technologies Covered

- OpenTelemetry Collector Contrib 0.160.0
- Attributes, resource, and transform processors
- OTTL context-aware enrichment and metric identity

## Sources Consulted

- [Attributes processor actions and hashing](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/attributesprocessor/README.md)
- [Resource processor configuration](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/resourceprocessor/README.md)
- [Transform processor configuration, contexts, functions, and gates](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md)
- [Collector pipeline architecture](https://opentelemetry.io/docs/collector/architecture/)
- [Collector validate command implementation](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.160.0/otelcol/command_validate.go)

## Issues Found

No technical issues found.

## Review Notes

- Reviewed ordered insert/copy/delete actions, resource insertion, conditional OTTL enrichment, and pipeline wiring. Missing-source no-op, destination preservation, and intentional legacy-key deletion follow the documented action contracts.
- Checked signal attribute versus resource ownership and the attributes processor's include/exclude capability. The comparison correctly reserves non-attribute fields and contextual transformations for suitable processors.
- Confirmed the release-specific SHA1 hash action, metric identity warning, and from_context/include_metadata caveat. Neither a short action list nor OTTL deletion implicitly aggregates colliding metric points.
- Also inspected the retained authoring-run configuration result for this post: 3 fragments met their expected validity result. These earlier results were not rerun here; intentionally broken examples remain identified as such.
- Reviewed on 2026-09-10 against official documentation and tagged source. No new Collector runtime execution or backend integration test was performed during this review.
