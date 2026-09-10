# Validation Summary: Access Arrays and Nested Maps Safely in OTTL Conditions

## Status

validated

## Post Type

Technical tutorial and troubleshooting guide.

## Technologies Covered

- OpenTelemetry Collector Contrib 0.160.0
- OTTL nested paths and short-circuit predicates
- Structured log maps, lists, and ParseJSON

## Sources Consulted

- [OTTL language and path grammar](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/LANGUAGE.md)
- [OTTL short-circuit boolean evaluator](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/boolean_value.go)
- [OTTL function contracts](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/README.md)
- [Log context, cache, and time paths](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/contexts/ottllog/README.md)
- [Value copying and nested indexing implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/contexts/internal/ctxutil/value.go)
- [ParseJSON implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/func_parse_json.go)
- [Collector validate command implementation](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.160.0/otelcol/command_validate.go)

## Issues Found

No technical issues found.

## Review Notes

- Reviewed all three extraction processors and each malformed-shape fixture. Parent type checks precede child access; list checks precede Len and the zero-based index, and element maps precede leaf access.
- Verified short-circuit order directly in boolean_value.go and out-of-range/type error behavior in ctxutil/value.go. Dotted keys remain literal names rather than implicit nested traversal.
- The JSON variant keeps parsing and dependent cache reads together and preserves the string body. It extracts only the first element and does not incorrectly present that operation as searching the entire collection.
- Also inspected the retained authoring-run configuration result for this post: 3 fragments met their expected validity result. These earlier results were not rerun here; intentionally broken examples remain identified as such.
- Reviewed on 2026-09-10 against official documentation and tagged source. No new Collector runtime execution or backend integration test was performed during this review.
