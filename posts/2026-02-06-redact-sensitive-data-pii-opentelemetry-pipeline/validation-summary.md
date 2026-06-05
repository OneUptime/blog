# Validation Summary: How to Redact Sensitive Data from Logs in the OpenTelemetry Pipeline

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- Transform processor
- OTTL functions
- Redaction processor
- Collector YAML configuration
- OTLP/HTTP JSON log ingestion

## Sources Consulted
- OpenTelemetry Collector Transform Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry OTTL function documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry Collector Redaction Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/redactionprocessor/README.md
- OpenTelemetry Collector OTLP Receiver documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Collector OTLP gRPC Exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md

## Issues Found
- The transform examples used legacy unqualified OTTL paths such as `body` and `attributes`. Current transform processor documentation uses prefixed paths such as `log.body` and `log.attributes`, and Collector 0.153.0 emits a rewrite warning for the old syntax. Updated the examples to use current path prefixes.
- The testing command posted OTLP/HTTP JSON logs to `http://localhost:4317/v1/logs`, but the sample receiver only enabled OTLP/gRPC on port 4317. Added the OTLP/HTTP receiver on port 4318 and changed the `curl` example to post to `http://localhost:4318/v1/logs`, matching the OTLP receiver defaults and OTLP specification.
- The redaction processor whitelist example included resource and severity fields even though the redaction processor filters span, log, and metric datapoint attributes, not resource attributes or log severity fields. Replaced those with representative telemetry attribute keys and clarified the comment.
- The structured log example accessed nested fields directly with `body["user"]["email"]` and `body["payment"]["card_number"]`. Updated it to `log.body` paths and added `IsMap` guards before nested map access.
- The performance section gave a specific CPU increase without a source or reproducible benchmark context. Reworded it to state the accurate general claim that regex overhead depends on log size, pattern complexity, and throughput.

## Review Notes
Validated representative corrected Collector configurations with `otel/opentelemetry-collector-contrib:latest` version 0.153.0 using `otelcol-contrib validate`. Also ran a local OTLP/HTTP JSON log through the transform processor to confirm body redaction output.
