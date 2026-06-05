# Validation Summary: How to Set Up Trace-Based Testing with Tracetest

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Collector
- OTLP
- Tracetest Core
- Tracetest CLI
- Docker Compose
- PostgreSQL
- GitHub Actions

## Sources Consulted
- Tracetest Docs - Welcome and feature overview: https://docs.tracetest.io/
- Tracetest Docs - Tracetest Core overview: https://docs.tracetest.io/core/getting-started/overview
- Tracetest Docs - Tracetest server configuration: https://docs.tracetest.io/core/configuration/server
- Tracetest Docs - Tracetest server provisioning: https://docs.tracetest.io/core/configuration/provisioning
- Tracetest Docs - OpenTelemetry Collector integration: https://docs.tracetest.io/configuration/connecting-to-data-stores/opentelemetry-collector
- Tracetest Docs - Defining tests as text files: https://docs.tracetest.io/cli/creating-tests
- Tracetest Docs - CLI configuration and run reference: https://docs.tracetest.io/cli/configuring-your-cli and https://docs.tracetest.io/cli/reference/tracetest_run
- OpenTelemetry Specification - OTLP exporter configuration: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Tracetest GitHub docker-compose example: https://raw.githubusercontent.com/kubeshop/tracetest/main/docker-compose.yaml

## Issues Found
- The Docker Compose example mounted a Tracetest provisioning file but did not pass `--provisioning-file /app/provisioning.yaml`, so the `DataStore` provisioning could be ignored. Added the command to the Tracetest service.
- The Docker Compose example started Tracetest without waiting for PostgreSQL readiness. Added a PostgreSQL healthcheck and made Tracetest depend on it with `condition: service_healthy`.
- The application used `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317` without explicitly setting the OTLP protocol. Current OpenTelemetry guidance allows SDKs to use OTLP/HTTP, where port 4318 is the conventional endpoint. Updated the endpoint to `http://otel-collector:4318` and set `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf` to match the collector's HTTP receiver.
- The Tracetest CLI examples used `--wait-for-result`, which is not present in the current CLI reference. The CLI waits by default and now exposes `--skip-result-wait` for the opposite behavior. Removed the obsolete flag from local and CI commands.

## Review Notes
The tutorial remains focused on Tracetest Core for local and CI usage. Current Tracetest documentation positions managed Tracetest and agents as the primary deployment path, while Tracetest Core is documented as a hobby self-hosted option. The post is still technically relevant for a local/CI tutorial, but future updates may want to clarify that deployment scope.
