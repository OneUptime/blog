# Validation Summary: How to Configure OpenTelemetry Collector with Vector as a Log Processing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP / OTLP HTTP
- Vector
- Vector Remap Language (VRL)
- Docker Compose
- TOML and YAML configuration

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Logs Data Model: https://opentelemetry.io/docs/specs/otel/logs/data-model/
- Vector OpenTelemetry source documentation: https://vector.dev/docs/reference/configuration/sources/opentelemetry/
- Vector HTTP sink documentation: https://vector.dev/docs/reference/configuration/sinks/http/
- Vector VRL function reference: https://vector.dev/docs/reference/vrl/functions/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/

## Issues Found
- Vector OpenTelemetry source configuration used unsupported top-level `address`, `grpc.enable`, and `http.enable` fields. Updated it to use current nested `grpc.address` and `http.address` configuration.
- Vector OpenTelemetry source output was referenced as `otel_logs`, but current Vector exposes signal-specific outputs such as `otel_logs.logs`. Updated the log processing transform input accordingly.
- The Vector examples used `.body` for the OTLP log body. Current Vector native OpenTelemetry log events expose the body as `message`, so the parsing and VRL examples now use `.message`.
- The health-check filter referenced `.attributes.http_target`, but OpenTelemetry-style HTTP attributes commonly use dotted keys such as `http.target`. Updated the example to read `http.target` with `get!`.
- The VRL example used a nonexistent `sample()` function. Replaced it with `random_float!(0.0, 1.0)` and a comparison against the configured sampling rate.
- The Docker Compose snippet included the obsolete top-level `version` field. Removed it to match current Compose behavior.

## Review Notes
- The corrected Vector configuration validates with Vector 0.56.0. Vector reports expected warnings that the OpenTelemetry source's metrics and traces outputs are not consumed, because this example intentionally processes only logs.
- The OpenTelemetry Collector configuration validates with the current `otel/opentelemetry-collector-contrib:latest` image.
- The Docker Compose snippet renders successfully with current Docker Compose after removing the obsolete `version` field.
