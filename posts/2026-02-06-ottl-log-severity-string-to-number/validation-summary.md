# Validation Summary: How to Use OTTL Transformations That Convert Log Severity Strings to

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry log data model
- OpenTelemetry Collector
- OpenTelemetry Transformation Language (OTTL)
- Transform processor
- Filter processor
- Filelog receiver
- Python logging levels
- YAML configuration

## Sources Consulted
- OpenTelemetry Logs Data Model specification: https://opentelemetry.io/docs/specs/otel/logs/data-model/
- OpenTelemetry Collector Contrib transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Contrib OTTL log context paths documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottllog
- OpenTelemetry Collector Contrib filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector Contrib filelog receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- Python logging library documentation: https://docs.python.org/3/library/logging.html

## Issues Found
- The transform examples used unprefixed OTTL log paths such as `severity_number`, `severity_text`, `attributes`, and `body`. Current transform processor and OTTL log context documentation use `log.severity_number`, `log.severity_text`, `log.attributes`, and `log.body`, so the examples were updated to the current documented path form.
- The examples used raw numeric severity values in OTTL statements. They were replaced with the documented OTTL severity enums such as `SEVERITY_NUMBER_INFO` and `SEVERITY_NUMBER_ERROR`, which better matches current Collector examples and avoids magic numbers in configuration.
- The log body extraction example called `IsMatch` on `body` without checking that the body was a string. It now guards those expressions with `IsString(log.body)` before matching, matching the official transform processor pattern for unstructured log bodies.
- The filter processor example used the deprecated `logs.log_record` configuration shape and an unprefixed `severity_number` path. It was updated to the current `log_conditions` form with `log.severity_number < SEVERITY_NUMBER_INFO`.

## Review Notes
The severity number scale in the post matches the OpenTelemetry Logs Data Model. The transform processor binary was not available locally, so I could not run `otelcol --config` validation; the snippets were checked against the current official documentation listed above.
