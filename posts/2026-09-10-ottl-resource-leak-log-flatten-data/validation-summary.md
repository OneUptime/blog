# Validation Summary: Prevent OTTL Resource Changes Leaking Across Log Records

## Status

validated

## Post Type

Technical tutorial and troubleshooting guide.

## Technologies Covered

- OpenTelemetry Collector Contrib 0.160.0
- OTTL log resource and scope mutation
- transform.flatten.logs feature gate

## Sources Consulted

- [Transform processor configuration, contexts, functions, and gates](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md)
- [Transform configuration validation and flattening gate](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/config.go)
- [OpenTelemetry resource model](https://opentelemetry.io/docs/concepts/resources/)
- [Log context, cache, and time paths](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/contexts/ottllog/README.md)
- [Collector configuration and feature-gate flags](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.160.0/otelcol/flags.go)
- [Collector validate command implementation](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.160.0/otelcol/command_validate.go)

## Issues Found

No technical issues found.

## Review Notes

- Reviewed the shared-resource counterexample and the complete isolation configuration. Config.Validate rejects flatten_data when the required feature gate is disabled.
- Confirmed per-record resource/scope copies followed by regrouping and the restriction to log processing. The feature does not flatten JSON bodies or isolate trace/metric parent mutations.
- The fixture correctly places multiple records in one incoming resource, including equal tenants and a missing tenant. CPU and memory overhead are stated as workload-dependent rather than given unsupported numbers.
- Also inspected the retained authoring-run configuration result for this post: 2 fragments met their expected validity result. These earlier results were not rerun here; intentionally broken examples remain identified as such.
- Reviewed on 2026-09-10 against official documentation and tagged source. No new Collector runtime execution or backend integration test was performed during this review.
