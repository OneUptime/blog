# Validation Summary: How to Trace Docker Build Performance with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Buildx and BuildKit
- OpenTelemetry traces and metrics
- OpenTelemetry Collector
- OTLP/gRPC
- Python OpenTelemetry SDK
- W3C Trace Context
- CI pipeline trace correlation

## Sources Consulted
- Docker Docs: OpenTelemetry support for Buildx and BuildKit - https://docs.docker.com/build/debug/opentelemetry/
- Docker Docs: `docker buildx build` CLI reference - https://docs.docker.com/reference/cli/docker/buildx/build/
- Moby BuildKit README and source tree, including OpenTelemetry exporter detection - https://github.com/moby/buildkit
- OpenTelemetry Protocol Exporter specification - https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector filter processor documentation - https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/filterprocessor
- OpenTelemetry Python exporter documentation - https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python metrics SDK documentation - https://opentelemetry-python.readthedocs.io/en/stable/sdk/metrics.export.html
- OpenTelemetry Propagators API - https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- W3C Trace Context specification - https://www.w3.org/TR/trace-context/

## Issues Found
- The BuildKit native tracing example set OTLP environment variables only in the shell before `docker build`. For a Docker-managed Buildx builder, the tracing environment needs to reach the builder process/container. Updated the example to create and bootstrap a `docker-container` builder with `env.OTEL_TRACES_EXPORTER`, `env.OTEL_EXPORTER_OTLP_ENDPOINT`, and `env.OTEL_EXPORTER_OTLP_PROTOCOL` driver options.
- The Collector filter processor configuration used an older/incorrect `spans.exclude.match_type` style. Updated it to the current OTTL-based `trace_conditions` syntax with `IsMatch(span.name, ...)` and `error_mode: ignore`.
- The CI integration section implied that exporting `TRACEPARENT` automatically links the custom Python wrapper spans to a parent trace. Updated the Python wrapper to extract `TRACEPARENT` with OpenTelemetry propagation APIs and clarified that the wrapper must use the extracted context.

## Review Notes
- The Python code blocks were checked with Python AST parsing and are syntactically valid.
- The Collector YAML snippet was parsed successfully as YAML.
- The wrapper script parses Docker progress text heuristically, so it is useful for custom control but less robust than native BuildKit telemetry when BuildKit output format changes.
