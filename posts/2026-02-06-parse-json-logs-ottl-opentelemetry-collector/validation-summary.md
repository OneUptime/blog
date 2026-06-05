# Validation Summary: How to Parse JSON Logs with OTTL in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Transformation Language (OTTL)
- Transform processor
- JSON log parsing
- OTLP log data model
- Collector YAML configuration

## Sources Consulted
- OpenTelemetry Collector Transform Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OTTL functions reference in opentelemetry-collector-contrib: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OTTL log context documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottllog/README.md
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Logs Data Model severity number documentation: https://opentelemetry.io/docs/specs/otel/logs/data-model/

## Issues Found
- The post listed `ParseSimpleJSON()`, which is not a documented OTTL JSON function. Replaced it with `String()`, which is a documented OTTL converter useful when handling parsed values.
- Several snippets used arbitrary temporary variables such as `temp_parsed_attr`, `temp_parsed`, `temp_k8s_msg`, and `temp_docker_log`. OTTL uses the context `cache` map for temporary state, so those examples were changed to `cache["..."]`.
- The temporary variable cleanup example used `delete_key(temp_parsed_attr, "")`, which is not a valid way to remove temporary state. Updated it to delete the appropriate key from `cache`.
- The graceful parsing example did not set `error_mode: ignore`, so invalid JSON could still interrupt processing depending on processor settings. Added `error_mode: ignore` and used `cache` to detect successful parsing.
- The array membership example used `IsMatch(String(body["tags"]), "urgent")`, which can produce false positives and is less accurate for slices. Updated it to use the documented `ContainsValue()` converter.
- The complete pipeline put JSON trace and span IDs into attributes instead of the OTLP log record trace/span fields. Updated the example to set `trace_id` and `span_id` using the documented `TraceID()` and `SpanID()` converters.
- The severity number mapping was incorrect: it mapped `error` to 9 and `info` to 17. Updated the example to use `SEVERITY_NUMBER_ERROR`, `SEVERITY_NUMBER_WARN`, and `SEVERITY_NUMBER_INFO`.
- The complete pipeline included an attributes processor that deleted `temp_parsed`, but no such attribute was created. Removed that unused processor from the example pipeline.
- The timestamp conversion example set a `time.Time` value into an attribute. Updated it to set the log `time` field with `Time(...)`, which matches the log context type.

## Review Notes
The examples use the `context: log` style with unprefixed paths such as `body` and `attributes`. Current OpenTelemetry Collector documentation primarily shows prefixed paths such as `log.body` and `log.attributes`, while older configuration forms remain supported. Future updates could modernize the snippets to the current documented style throughout.
