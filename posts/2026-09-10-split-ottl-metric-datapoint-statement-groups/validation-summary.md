# Validation Summary: Split OTTL Groups When Metric and Datapoint Functions Cannot Mix

## Status

validated

## Post Type

Technical tutorial and troubleshooting guide.

## Technologies Covered

- OpenTelemetry Collector Contrib 0.160.0
- OTTL context inference and advanced groups
- Metric conversion and data point processing

## Sources Consulted

- [Transform processor configuration, contexts, functions, and gates](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md)
- [Metric context paths](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/contexts/ottlmetric/README.md)
- [Data point context paths](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/contexts/ottldatapoint/README.md)
- [Collector validate command implementation](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.160.0/otelcol/command_validate.go)

## Issues Found

No technical issues found.

## Review Notes

- Reviewed the deliberately incompatible basic group and each of the three corrected configurations against the documented context inference rules.
- Checked the dependency created by renaming legacy.active before adding data point attributes. The article preserves configuration order and correctly limits aggregate operations to the current metric.
- Confirmed that shared_cache is explicitly experimental and optional; the tutorial does not depend on caches persisting between ordinary statement groups. Metric conversion remains conditional on a justified measurement model.
- Also inspected the retained authoring-run configuration result for this post: 4 fragments met their expected validity result. These earlier results were not rerun here; intentionally broken examples remain identified as such.
- Reviewed on 2026-09-10 against official documentation and tagged source. No new Collector runtime execution or backend integration test was performed during this review.
