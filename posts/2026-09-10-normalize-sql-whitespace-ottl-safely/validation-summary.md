# Validation Summary: Normalize SQL Span Whitespace with OTTL Without Losing Meaning

## Status

validated

## Post Type

Technical tutorial and troubleshooting guide.

## Technologies Covered

- OpenTelemetry Collector Contrib 0.160.0
- OTTL pattern replacement and Go regex
- SQL query text semantic conventions

## Sources Consulted

- [OTTL function contracts](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/README.md)
- [Pattern replacement implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/func_replace_pattern.go)
- [Go regular expression syntax](https://pkg.go.dev/regexp/syntax)
- [SQL semantic conventions](https://opentelemetry.io/docs/specs/semconv/db/sql/)
- [Collector validate command implementation](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.160.0/otelcol/command_validate.go)

## Issues Found

No technical issues found.

## Review Notes

- Reviewed both replacement configurations and all SQL counterexamples. Actual newline characters, serialized JSON escapes, and literal backslash-letter sequences are distinguished correctly.
- Checked the plain-YAML/OTTL escaping that passes a literal-backslash regex to Go. Replacements operate only on a copied display attribute under an explicit application-owned safe-input marker.
- The original query is preserved and no general SQL equivalence claim is made. The discussion correctly identifies quoted data, comments, identifiers, and dialect syntax as reasons that arbitrary whitespace collapse is unsafe.
- Also inspected the retained authoring-run configuration result for this post: 2 fragments met their expected validity result. These earlier results were not rerun here; intentionally broken examples remain identified as such.
- Reviewed on 2026-09-10 against official documentation and tagged source. No new Collector runtime execution or backend integration test was performed during this review.
