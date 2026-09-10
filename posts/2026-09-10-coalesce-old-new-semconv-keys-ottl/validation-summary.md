# Validation Summary: Coalesce Old and New OpenTelemetry Attribute Keys with OTTL

## Status

validated

## Post Type

Technical tutorial and troubleshooting guide.

## Technologies Covered

- OpenTelemetry Collector Contrib 0.160.0
- OTTL Coalesce and nil handling
- HTTP and deployment resource conventions

## Sources Consulted

- [Coalesce implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/func_coalesce.go)
- [OTTL function contracts](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/README.md)
- [set implementation and nil behavior](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/func_set.go)
- [HTTP semantic convention migration](https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/)
- [HTTP request method normalization](https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/)
- [Collector validate command implementation](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.160.0/otelcol/command_validate.go)

## Issues Found

The HTTP example described legacy/current method keys as a straightforward equivalent-field migration without mentioning the changed value contract. Added the prerequisite that legacy values already satisfy current normalization and explained unknown-method _OTHER handling and method_original requirements. This prevents presenting arbitrary legacy-value copying as a complete semantic migration.

## Review Notes

- Reviewed the span and resource examples, first-non-nil list order, missing-value guard, and truth table. Coalesce does not reject empty strings, false, zero, or wrong-type candidates.
- Checked the current method normalization rules against the HTTP registry and migration guide. The compatibility expression remains a precedence example, with its schema prerequisite now explicit.
- Verified that resource mapping reads only resource values and that unit/meaning changes need real conversion rather than coalescing. Old keys remain intentionally available for consumers during migration.
- Also inspected the retained authoring-run configuration result for this post: 2 fragments met their expected validity result. These earlier results were not rerun here; intentionally broken examples remain identified as such.
- Reviewed on 2026-09-10 against official documentation and tagged source. No new Collector runtime execution or backend integration test was performed during this review.
