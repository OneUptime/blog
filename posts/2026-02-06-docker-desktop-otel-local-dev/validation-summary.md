# Validation Summary: How to Use Docker Desktop Built-In OpenTelemetry Integration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Desktop
- Docker Compose
- OpenTelemetry Collector
- OTLP over gRPC and HTTP
- OpenTelemetry Go SDK
- OpenTelemetry Python SDK
- OpenTelemetry Java agent
- Grafana Tempo
- Grafana

## Sources Consulted
- Docker Docs: OpenTelemetry for the Docker CLI - https://docs.docker.com/engine/cli/otel/
- Docker Docs: Compose file reference - https://docs.docker.com/reference/compose-file/
- Docker Docs: Docker Desktop networking how-tos - https://docs.docker.com/desktop/features/networking/networking-how-tos/
- OpenTelemetry Docs: Install the Collector with Docker - https://opentelemetry.io/docs/collector/install/docker/
- OpenTelemetry Docs: OTLP Exporter Configuration - https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry Specification: OTLP Exporter - https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Docs: Resources - https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry Semantic Conventions: Deployment attributes - https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry Go SDK resource package - https://go.opentelemetry.io/otel/sdk/resource
- OpenTelemetry Python OTLP exporter docs - https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Java SDK configuration - https://opentelemetry.io/docs/languages/java/configuration/
- Grafana Tempo Docs: OpenTelemetry Collector - https://grafana.com/docs/tempo/latest/set-up-for-tracing/instrument-send/set-up-collector/otel-collector/

## Issues Found
- The post claimed Docker Desktop includes a built-in OpenTelemetry Collector for application telemetry. Docker's official documentation covers Docker CLI OpenTelemetry metrics and BuildKit/build traces, but does not document a built-in Docker Desktop OTLP receiver for arbitrary application container telemetry. I changed the post to run an explicit OpenTelemetry Collector container in Docker Desktop.
- The post claimed Docker Desktop exposes `host.docker.internal:4317` and `host.docker.internal:4318` as built-in OTLP endpoints. I changed these to `otel-collector:4317` for OTLP/gRPC and `otel-collector:4318` for OTLP/HTTP when the app and collector share a Compose network, with `host.docker.internal` only described for reaching a collector published on the host.
- The post claimed Docker Desktop provides a built-in application trace viewer under an OpenTelemetry or Observability tab. I replaced this with checking OpenTelemetry Collector logs or using a trace backend such as Grafana Tempo.
- The Compose examples used the obsolete top-level `version: "3.8"` field. I removed it to align with the current Compose Specification.
- The examples used deprecated `deployment.environment`. I changed it to the stable semantic convention `deployment.environment.name`.
- The Go example manually set only `service.name` and ignored `OTEL_RESOURCE_ATTRIBUTES`. I changed it to use `resource.WithFromEnv()` so the resource environment variables in the Compose snippet are applied.
- The Java example pointed at an OTLP/HTTP port without setting the OTLP protocol. I added `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf`.
- The Grafana/Tempo section said traces were forwarded from Docker Desktop. I changed this to forwarding from the OpenTelemetry Collector and added a minimal collector pipeline that exports traces to Tempo over OTLP/gRPC.

## Review Notes
The corrected post is now a local OpenTelemetry Collector guide rather than a Docker Desktop built-in integration guide. The remaining Grafana and Tempo snippets still assume the referenced `tempo-config.yaml` and `grafana-datasources.yaml` files exist, so a future revision could include those supporting files for a fully copy-pasteable stack.
