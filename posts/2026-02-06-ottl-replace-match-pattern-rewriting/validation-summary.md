# Validation Summary: How to Use OTTL replace_match and replace_all_matches for Pattern-Based

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Transformation Language (OTTL)
- Transform Processor
- OTTL `replace_match`, `replace_all_matches`, and `replace_pattern`
- Go `filepath.Match` glob syntax
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Collector Contrib OTTL functions documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/ottl/ottlfuncs
- OpenTelemetry Collector Contrib Transform Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor
- OpenTelemetry Collector Contrib OTTL language documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/ottl
- Go `path/filepath.Match` documentation: https://pkg.go.dev/path/filepath#Match
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/

## Issues Found
- The post described `replace_all_matches` as operating on all attributes without noting its map target and string-value behavior. Updated the explanation and examples to say it operates on a map such as `span.attributes` and replaces matching string values.
- The post implied glob matching was substring-like and that `*` matched any sequence of characters. Updated the explanation to match Go `filepath.Match`: patterns must match the whole string, and `*`/`?` do not match path separators.
- Several transform processor snippets used the older nested `context`/`statements` form and unprefixed paths such as `attributes[...]` and `body`. Updated snippets to the current documented signal statement list style with paths such as `span.attributes[...]`, `resource.attributes[...]`, and `log.body`.
- The service version example used `replace_match(..., "v*", "")` while claiming `"v1.2.3" -> "1.2.3"`. Because `replace_match` replaces the entire matched value, changed that example to `replace_pattern(..., "^v", "")`.
- The SQL examples used partial patterns such as `WHERE id = *`, which would not match an entire SQL statement. Updated them to full-string example patterns.
- The glob limitations section incorrectly said character classes like `[a-z]` are unsupported. Updated it to note that `filepath.Match` supports character classes while still lacking regex quantifiers and capture groups.
- The performance section claimed ordering statements by frequency takes advantage of short-circuit evaluation. Independent transform statements execute in order, so this was changed to recommend `where` clauses to avoid unnecessary work.

## Review Notes
The examples are now aligned with current transform processor documentation for version 0.120.0 and later. Some examples still use generic attributes such as `db.statement` and recorded authorization headers; deployments should confirm these attributes exist in their telemetry and evaluate privacy risks before collecting sensitive values.
