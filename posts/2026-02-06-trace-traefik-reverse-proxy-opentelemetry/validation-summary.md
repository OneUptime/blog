# Validation Summary: How to Trace Traefik Reverse Proxy Requests with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Traefik v3 reverse proxy and ingress controller
- OpenTelemetry tracing and OTLP export
- OpenTelemetry Collector
- Docker Compose
- Kubernetes, Helm, and Traefik IngressRoute CRDs
- Python Flask OpenTelemetry instrumentation

## Sources Consulted
- Traefik v3.1 OpenTelemetry tracing documentation: https://doc.traefik.io/traefik/v3.1/observability/tracing/opentelemetry/
- Traefik v3.1 tracing overview and common tracing options: https://doc.traefik.io/traefik/v3.1/observability/tracing/overview/
- Traefik API and dashboard documentation: https://doc.traefik.io/traefik/operations/dashboard/
- Traefik v3.1 Docker quick start: https://doc.traefik.io/traefik/v3.1/getting-started/quick-start/
- Traefik boot environment and static configuration methods: https://doc.traefik.io/traefik/v3.3/reference/install-configuration/boot-environment/
- Traefik v3.1 RateLimit middleware documentation: https://doc.traefik.io/traefik/v3.1/middlewares/http/ratelimit/
- Traefik v3.1 dynamic file configuration reference: https://doc.traefik.io/traefik/v3.1/reference/dynamic-configuration/file/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector installation documentation: https://opentelemetry.io/docs/collector/installation/
- OpenTelemetry OTLP exporter configuration specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry OTLP exporter configuration guide: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- Traefik v3.0 migration details for OpenTelemetry tracing: https://doc.traefik.io/traefik/v3.0/migration/v2-to-v3-details/

## Issues Found
- The dashboard example mapped port `8080` but only set `api.dashboard: true`. Traefik exposes the dashboard on the `traefik` entrypoint/port 8080 in insecure mode, so I added `api.insecure: true` to the local static configuration example.
- The Docker Compose example mounted `otel-collector-config.yaml` to `/etc/otelcol/config.yaml`, but the official contrib Collector image expects `/etc/otelcol-contrib/config.yaml` by default. I corrected the mount path.
- The Docker Compose example mixed mounted static file configuration with CLI static configuration in the same Traefik service. Traefik documentation says to choose one static configuration method, so I removed the duplicated CLI `command` block and kept the mounted `traefik.yaml`.
- The backend service environment pointed to the OTLP gRPC port but did not specify the OTLP transport protocol. I added `OTEL_EXPORTER_OTLP_PROTOCOL=grpc` so SDKs with HTTP defaults do not try to send OTLP/HTTP to port 4317.
- The Kubernetes section said tracing configuration can go into "the Traefik CRD." Tracing is static configuration, while IngressRoute CRDs are dynamic routing configuration. I changed this to Helm values or static configuration for the Traefik deployment.

## Review Notes
- The post intentionally targets Traefik v3.1. Traefik continues to evolve after v3.1, so future updates may want to mention newer tracing options and current image tags.
- The OpenTelemetry Collector image tag `0.96.0` is old for a 2026-dated post, but the shown collector pipeline structure remains valid. Updating to a newer pinned Collector version would be a maintenance improvement rather than a correctness fix.
