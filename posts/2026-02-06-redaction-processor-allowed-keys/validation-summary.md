# Validation Summary: How to Use the Redaction Processor allowed_keys List to Whitelist Safe

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib redaction processor
- OpenTelemetry semantic conventions
- YAML Collector configuration
- Python

## Sources Consulted
- OpenTelemetry Collector Contrib redaction processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/redactionprocessor/README.md
- OpenTelemetry Collector Contrib redaction processor config spec: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/redactionprocessor/config.go
- OpenTelemetry Collector Contrib redaction processor implementation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/redactionprocessor/processor.go
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry HTTP semantic convention attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- OpenTelemetry database semantic convention migration guide: https://opentelemetry.io/docs/specs/semconv/non-normative/db-migration/
- OpenTelemetry database client span semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- OpenTelemetry semantic conventions overview: https://opentelemetry.io/docs/specs/otel/semantic-conventions/

## Issues Found
- The post stated that `allowed_keys` supports regex patterns. The official redaction processor configuration defines `allowed_keys` as exact attribute keys, and the implementation builds a string lookup map rather than compiling regexes. I replaced the regex allowlist examples with exact key lists.
- The post used the regex `db\\.(?!statement).*`. The Collector uses Go regular expressions, which do not support negative lookahead. I removed that pattern and changed the database examples to explicit allowed database keys that exclude query text attributes.
- The complete configuration used regex-looking strings in `allowed_keys`, which would have been treated as literal key names and would not have matched normal attributes. I replaced them with exact attribute names and added `allow_all_keys: false` explicitly.
- The monitoring section said the redaction processor logs blocked keys at debug level. Current documentation describes diagnostic attributes controlled by the processor's `summary` setting, such as `redaction.redacted.keys` and `redaction.redacted.count`. I updated the section to use `summary: debug`, with production notes for `info` and `silent`.
- The monitoring snippet used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. I removed that snippet because it was not needed for observing redaction actions.
- Several examples mixed deprecated semantic convention attributes with current ones, such as legacy HTTP and database names. I updated the examples to use current attribute names where appropriate.
- The team namespace example used regex values in `allowed_keys`. I changed that example to use exact standard keys plus `ignored_key_patterns` for trusted team prefixes, and added the caveat that ignored keys are not checked against `blocked_values`.

## Review Notes
- The Python helper is a rough way to extract keys from debug output and may need adjustment for debug exporter formats or attribute keys outside `[a-zA-Z0-9_.]`.
- The redaction processor is currently beta for traces and alpha for logs and metrics in the upstream component metadata.
