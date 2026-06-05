# Validation Summary: How to Create a Minimal Collector Config for Local Testing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP) over gRPC and HTTP
- OpenTelemetry Collector receivers, processors, exporters, pipelines, and extensions
- OpenTelemetry Collector debug and file exporters
- OpenTelemetry attributes and resource processors
- telemetrygen
- Docker and Docker Compose
- jq

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector file exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/fileexporter/README.md
- OpenTelemetry Collector attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector resource processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- OpenTelemetry telemetrygen README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/cmd/telemetrygen/README.md
- telemetrygen current Docker image help output for traces, metrics, and logs.
- OpenTelemetry Collector contrib Docker image `validate` command.

## Issues Found
- The Sending Test Data section implied that the first traces-only minimal config would print metrics and logs. Added a clarification that metrics and logs require metrics and logs pipelines.
- The file exporter example wrote to `/tmp/otel-output.json`, but the official Collector contrib container needs a writable mounted path. Changed the path to `/otel-output/otel-output.json` and added a Docker command that mounts a writable host directory.
- The `jq` examples assumed every file exporter record was a trace object and that timestamp fields were numeric. Updated the filters to select trace records from mixed NDJSON output and convert nanosecond timestamp strings before subtraction.
- The architecture diagram referenced the old file path. Updated it to `/otel-output/otel-output.json`.
- The processing example described deleting `host.name` with the attributes processor, but `host.name` is normally a resource attribute. Moved that deletion to the resource processor and updated the explanation.
- The processing example said it applied to all telemetry while only defining a traces pipeline. Added metrics and logs pipelines using the same processors.
- The Docker Compose snippet exposed zPages port 55679 without configuring and enabling the zPages extension. Removed the port mapping from the compose example.
- The Docker Compose environment did not specify the OTLP protocol while using the gRPC port. Added `OTEL_EXPORTER_OTLP_PROTOCOL=grpc`.
- The configuration-switching Docker commands mounted config files at `/etc/otelcol/config.yaml` but did not pass `--config`, so the image default config path might be used instead. Added `--config /etc/otelcol/config.yaml`.
- The `--set` example used dot-separated keys. Updated it to the Collector's documented double-colon nested-key syntax.

## Review Notes
- The reviewed Collector YAML snippets were extracted from the post and validated successfully with `otel/opentelemetry-collector-contrib:latest validate`.
- The local environment does not have Go installed, so the `go install` command for telemetrygen was checked against the official telemetrygen README rather than executed locally.
