# Validation Summary: How to Extract Nested JSON Fields from Log Bodies into Top-Level Attributes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Transformation Language (OTTL)
- Transform processor
- Filelog receiver
- Stanza `json_parser` and `move` operators
- OTLP logs

## Sources Consulted
- OpenTelemetry Collector contrib transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OTTL functions reference for `set`, `merge_maps`, `ParseJSON`, `IsString`, `IsMatch`, and `IsList`: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OTTL language reference for paths, maps, indexing, conditions, nil checks, and comparisons: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/LANGUAGE.md
- OTTL log context paths and severity enum values: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottllog/README.md
- Filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- Stanza `json_parser` operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/json_parser.md
- Stanza `move` operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/move.md
- Practical config validation with `otel/opentelemetry-collector-contrib:0.153.0 validate`.

## Issues Found
- The first transform example said parsing into `cache` changes `body` into a structured map. Updated the comment to state that `cache` contains the parsed fields and `body` remains unchanged.
- The post implied `where IsString(body)` avoids parse errors. Updated transform examples to use `error_mode: ignore` and an `IsString(body) and IsMatch(body, "^\\s*\\{")` guard, since `ParseJSON` can still error on malformed JSON.
- The parse-failure example used `cache != nil` as a success check. The transform context cache is a map used as temporary storage, so this is not a reliable parse-success marker. Updated the marker to key off `cache["request_id"] != nil`.
- The array extraction example indexed `cache["tags"][0]` after only checking that `cache["tags"]` was non-nil. Updated the guard to `IsList(cache["tags"])` so the index operation is only attempted for list values.

## Review Notes
The representative transform and filelog configuration validated successfully with OpenTelemetry Collector contrib 0.153.0. The snippets use the explicit `context: log` form, which remains valid, while current official examples often show inferred-context paths such as `log.body` and `log.cache`.
