# Validation Summary: How to Use the OTTL Playground to Test OpenTelemetry Collector Transformations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Transformation Language (OTTL)
- Transform processor
- Debug exporter
- Collector YAML configuration
- OTTL functions including `set`, `delete_key`, `merge_maps`, `ExtractPatterns`, `ParseJSON`, `replace_pattern`, `Int`, `Double`, `ToLowerCase`, and `ToUpperCase`
- Community and vendor OTTL playground/testing tools

## Sources Consulted
- OpenTelemetry Collector Contrib Transform Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Contrib OTTL functions documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/ottl/ottlfuncs
- Go package documentation for OTTL functions: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/ottlfuncs
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- Elastic OTTL Playground project overview: https://github.com/elastic/ottl-playground

## Issues Found
- The post implied the OTTL Playground was a single canonical web tool. Updated the wording to refer to community OTTL playgrounds and vendor testing environments.
- The email extraction examples used `ExtractPatterns` with unnamed capture groups and expected a string result. `ExtractPatterns` requires named capture groups and returns a map, so the examples now use named groups with `merge_maps(attributes, ExtractPatterns(...), "upsert")`.
- The redaction example said it extracted email before redacting, but the statement came after the redaction statements. Updated the comment to match the actual order.
- The type conversion example used `Int()` for a decimal duration. Updated it to use the documented `Double()` converter.
- The team test-case Markdown example had malformed nested code fences and an invalid `ExtractPatterns` example. Switched the outer example fence to tildes and fixed the OTTL extraction statement.
- The reusable environment normalization example used `Lower()`, which is not the documented converter name. Updated it to `ToLowerCase()`.
- The common testing patterns used arbitrary temporary variables such as `temp_data`, `temp_valid`, and `temp_enrich`. OTTL uses the `cache` map for temporary state, so those examples now use `cache["..."]` and clean up with `delete_key(cache, "...")`.
- The ETL example used `Upper()`, which is not the documented converter name. Updated it to `ToUpperCase()`.

## Review Notes
The examples use the older context-scoped OTTL path style with unprefixed paths such as `body`, `attributes`, and `resource.attributes`. Current transform processor documentation for version 0.120.0 and later primarily shows prefixed paths such as `log.body` and `log.attributes`, while older configuration forms remain supported. Future updates could modernize the snippets to the current documented style throughout.
