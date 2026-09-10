# Validation Summary: Debug an OTTL Rule That Parses but Never Matches

## Status

validated

## Post Type

Technical tutorial and troubleshooting guide.

## Technologies Covered

- OpenTelemetry Collector Contrib 0.160.0
- OTTL predicates and debug logging
- HTTP semantic conventions

## Sources Consulted

- [Transform processor configuration, contexts, functions, and gates](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md)
- [OTTL language and path grammar](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/LANGUAGE.md)
- [HTTP semantic convention migration](https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/)
- [Collector pipeline architecture](https://opentelemetry.io/docs/collector/architecture/)
- [Collector validate command implementation](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.160.0/otelcol/command_validate.go)

## Issues Found

No technical issues found.

## Review Notes

- Reviewed the complete diagnostic configuration and both candidate/selected fragments. Exact component IDs and explicit pipeline references are required.
- Checked resource versus span attribute ownership, integer versus string status values, current/legacy HTTP status keys, and debug-level service telemetry configuration.
- Confirmed that group conditions use OR while conjunctions inside one expression use AND. The positive/negative fixture and discussion of previous mutations are consistent with ordered processor execution.
- Also inspected the retained authoring-run configuration result for this post: 3 fragments met their expected validity result. These earlier results were not rerun here; intentionally broken examples remain identified as such.
- Reviewed on 2026-09-10 against official documentation and tagged source. No new Collector runtime execution or backend integration test was performed during this review.
