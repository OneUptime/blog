# Validation Summary: How to Configure the Redaction Processor in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib redaction processor
- OpenTelemetry Collector filter processor
- OpenTelemetry Collector transform processor
- OpenTelemetry debug exporter
- OTLP HTTP exporter
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Collector Contrib redaction processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/redactionprocessor/README.md
- OpenTelemetry Collector Contrib redaction processor config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/redactionprocessor/config.go
- OpenTelemetry Collector processor component list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector Contrib filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector Contrib transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md

## Issues Found
- The post described broad built-in PII detection patterns as enabled by default. The redaction processor requires configured `blocked_values` regexes for value masking, so the article now says patterns must be provided explicitly.
- Several examples used an invalid `patterns` field. Replaced those with `blocked_values`, which is the documented field for value regexes.
- Several examples used `blocked_values` as if it matched attribute keys. Replaced those cases with `blocked_key_patterns`, which is the documented field for key-based masking.
- The post described `summary` as replacement text and as a hashing selector. Corrected it to `silent`, `info`, or `debug`, and added `hash_function: sha3` where hashing was intended.
- The post described `allowed_keys` as a bypass list. Corrected the explanation: `allowed_keys` is a fail-closed retain-list, while `ignored_keys` / `ignored_key_patterns` bypass redaction and `allowed_values` bypasses value masking.
- The environment filter example used an outdated/deprecated style and the wrong drop semantics for routing. Updated it to current OTTL `trace_conditions` that drop telemetry not matching the target environment.
- The audit example used the removed/deprecated `logging` exporter and `loglevel`. Replaced it with the current `debug` exporter and `verbosity: detailed`.
- The transform example used unqualified log paths. Updated it to use `log.body` and `log.attributes[...]` per current transform processor examples.

## Review Notes
The YAML snippets parse successfully. Full Collector component validation was not run because no `otelcol` or `otelcol-contrib` binary is installed in the workspace.
