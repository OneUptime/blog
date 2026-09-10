# Validation Summary: Redact Passwords, Tokens, and URL Secrets with OTTL Patterns

## Status

validated

## Post Type

Technical tutorial and troubleshooting guide.

## Technologies Covered

- OpenTelemetry Collector Contrib 0.160.0
- OTTL deletion and regex replacement
- URL parameters, log redaction, and Collector export paths

## Sources Consulted

- [OTTL function contracts](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/README.md)
- [Pattern replacement implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/func_replace_pattern.go)
- [Go regular expression syntax](https://pkg.go.dev/regexp/syntax)
- [Transform processor configuration, contexts, functions, and gates](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md)
- [Collector pipeline architecture](https://opentelemetry.io/docs/collector/architecture/)
- [Collector validate command implementation](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.160.0/otelcol/command_validate.go)

## Issues Found

No technical issues found.

## Review Notes

- Reviewed attribute deletions, both URL source keys, query-value replacement, and constrained text/Bearer expressions. Collector dollar escaping leaves the intended capture-group reference for the regex replacement engine.
- Checked repeated-parameter and case-insensitive matching behavior and the stated limits for encoded names, whitespace-containing values, fragments, nested URLs, and nonstring bodies.
- The failure-policy discussion correctly avoids treating ignore as fail-closed redaction. Every export branch and additional signal/body copy needs its own handling; the article explicitly makes those limits visible.
- Also inspected the retained authoring-run configuration result for this post: 3 fragments met their expected validity result. These earlier results were not rerun here; intentionally broken examples remain identified as such.
- Reviewed on 2026-09-10 against official documentation and tagged source. No new Collector runtime execution or backend integration test was performed during this review.
