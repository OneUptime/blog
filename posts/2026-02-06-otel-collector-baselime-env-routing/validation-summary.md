# Validation Summary: How to Configure the OpenTelemetry Collector to Export to Baselime with

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- OTLP and OTLP/HTTP
- Baselime OpenTelemetry ingestion
- OpenTelemetry Collector routing connector
- OpenTelemetry Collector resource, batch, transform, filter, and tail sampling processors
- AWS Lambda and ECS task configuration

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- Baselime OpenTelemetry documentation: https://baselime.io/docs/sending-data/platforms/opentelemetry/
- OpenTelemetry Collector OTLP HTTP exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/otlphttpexporter
- OpenTelemetry Collector Contrib routing processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/routingprocessor/README.md
- OpenTelemetry Collector Contrib routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector Contrib transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Contrib filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector Contrib span OTTL context README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottlspan/README.md
- OpenTelemetry Collector Contrib tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry semantic conventions for FaaS attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/faas/

## Issues Found
- Collector environment-variable substitution used the older `${VAR}` style. Updated examples to use the current documented `${env:VAR}` syntax.
- The environment routing example used the deprecated `routing` processor and an invalid map-shaped routing table. Replaced it with the current `routing` connector, OTTL resource conditions, and explicit routed trace/log pipelines.
- The transform example used unqualified span paths and a `duration` expression that is not valid in the current span OTTL context. Updated it to use `span.attributes` and `(span.end_time - span.start_time) > Duration("3s")`.
- The filter example used the legacy `traces.span` configuration shape and unqualified `name` path. Updated it to `trace_conditions` with `span.name`.
- The tail sampling cold-start policy treated `faas.coldstart` as a string. Updated it to `boolean_attribute` with `value: true`, matching the semantic convention type.
- The pricing statement was too specific without an official current pricing source. Reworded it to focus on controlling ingestion volume.

## Review Notes
Validated the corrected Collector YAML snippets with `otel/opentelemetry-collector-contrib:0.153.0 validate`. The Baselime endpoint is plausible for the Collector `otlphttp` exporter because the exporter appends `/v1/traces` and `/v1/logs` to the configured base endpoint.
