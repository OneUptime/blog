# Validation Summary: How to Scrub Email Addresses and Phone Numbers from Log Bodies

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Transformation Language (OTTL)
- Transform processor
- OTTL `replace_pattern` function
- Filelog receiver
- Debug exporter
- Redaction processor
- YAML Collector configuration
- Regular expressions

## Sources Consulted
- OpenTelemetry Collector Transform Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OTTL Functions README, including `replace_pattern`: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/ottl/ottlfuncs
- OTTL Log Context README, including `body` and `attributes` paths: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottllog/README.md
- OpenTelemetry Collector Redaction Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/redactionprocessor/README.md
- OpenTelemetry Collector Filelog Receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector Debug Exporter documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/debugexporter
- OpenTelemetry Collector troubleshooting docs for the debug exporter: https://opentelemetry.io/docs/collector/troubleshooting/

## Issues Found
- The complete configuration described one phone regex as covering "US/international phone numbers", but that regex did not match common US formats such as `(800) 555-0199`. I split it into a US phone-number replacement and a simple international phone-number replacement so the configuration matches the stated behavior.
- The debug exporter example showed only raw log lines, but `verbosity: detailed` outputs structured telemetry details and log bodies are shown as body fields. I changed the wording and sample output to show `Body: Str(...)` values.
- The redaction processor was described only as attribute-level and later as being for span attributes. I clarified that it works on span, log, and metric datapoint attributes, matching the current redaction processor documentation.

## Review Notes
The OTTL `replace_pattern` usage, transform processor `log_statements` structure, filelog receiver `include` and `start_at` fields, and debug exporter `verbosity: detailed` setting are consistent with current official documentation. The regexes are intentionally examples rather than exhaustive email or international telephone-number validators; production use should still test against real logs and expected false positives.
