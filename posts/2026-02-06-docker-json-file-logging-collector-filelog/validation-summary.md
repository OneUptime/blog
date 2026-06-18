# Validation Summary: How to Configure the Docker JSON-File Logging Driver with the Collector Filelog

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker json-file logging driver
- Docker daemon logging configuration
- Docker bind mounts
- OpenTelemetry Collector
- OpenTelemetry Collector filelog receiver
- OpenTelemetry log semantic conventions
- OTLP exporter

## Sources Consulted
- Docker Docs: JSON File logging driver - https://docs.docker.com/engine/logging/drivers/json-file/
- Docker Docs: Bind mounts - https://docs.docker.com/engine/storage/bind-mounts/
- OpenTelemetry Collector Contrib: File Log Receiver README - https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector Contrib: Stanza json_parser operator - https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/json_parser.md
- OpenTelemetry Collector Contrib: Stanza regex_parser operator - https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/regex_parser.md
- OpenTelemetry Collector Contrib: Stanza timestamp parsing parameters - https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/timestamp.md
- OpenTelemetry Docs: General logs attributes - https://opentelemetry.io/docs/specs/otel/logs/semantic_conventions/

## Issues Found
- The Docker daemon configuration section did not mention that daemon-level logging changes apply to newly created containers after Docker restarts. Added a sentence clarifying that existing containers do not automatically switch logging configuration.
- The container ID extraction example parsed `attributes["log.file.path"]`, but the filelog receiver does not add `log.file.path` by default. Updated the example to set `include_file_path: true` before using the regex parser.

## Review Notes
The main filelog receiver configuration, Docker json-file log format, `json_parser` usage, `start_at: end`, `poll_interval` default, log rotation explanation, `log.iostream` attribute, and Docker run command structure were consistent with the consulted documentation. The guide uses `otel/opentelemetry-collector-contrib:latest`; pinning a specific Collector version would improve reproducibility in the future.
