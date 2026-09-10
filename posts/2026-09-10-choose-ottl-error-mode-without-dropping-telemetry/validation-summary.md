# Validation Summary: Choose OTTL Error Modes Without Accidentally Dropping Telemetry

## Status

validated

## Post Type

Technical tutorial and troubleshooting guide.

## Technologies Covered

- OpenTelemetry Collector Contrib 0.160.0
- OTTL runtime error modes
- Log parsing and Collector pipelines

## Sources Consulted

- [Transform processor configuration, contexts, functions, and gates](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md)
- [ParseJSON implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/func_parse_json.go)
- [OTTL function contracts](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/README.md)
- [Collector pipeline architecture](https://opentelemetry.io/docs/collector/architecture/)
- [Collector validate command implementation](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.160.0/otelcol/command_validate.go)

## Issues Found

No technical issues found.

## Review Notes

- Reviewed the error-mode table, explicit processor and group settings, optional parsing example, and mixed-payload test guidance. The beta defaultErrorModeIgnore gate is enabled by default in the cited release.
- Checked that guards distinguish string bodies from map results, and that the unconditional marker indicates processing reachability rather than parse success.
- The distinction between startup errors and runtime failures is correct. Propagation is not transactional rollback or a guarantee that only one record is lost; receiver/exporter behavior must be tested with the deployed pipeline.
- Also inspected the retained authoring-run configuration result for this post: 2 fragments met their expected validity result. These earlier results were not rerun here; intentionally broken examples remain identified as such.
- Reviewed on 2026-09-10 against official documentation and tagged source. No new Collector runtime execution or backend integration test was performed during this review.
