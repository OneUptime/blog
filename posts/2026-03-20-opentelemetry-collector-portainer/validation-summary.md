# Validation Summary: How to Deploy OpenTelemetry Collector via Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector (contrib distribution)
- Portainer (Docker stack deployment)
- Docker / Docker Compose
- Jaeger (all-in-one)
- Prometheus
- Grafana
- OpenTelemetry Python SDK
- OpenTelemetry Node.js SDK (`@opentelemetry/sdk-node`, `@opentelemetry/exporter-trace-otlp-grpc`)
- OTLP (gRPC and HTTP), Zipkin, and Jaeger ingestion protocols

## Sources Consulted
- OpenTelemetry Collector contrib `healthcheckextension` README — https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/healthcheckextension/README.md
- Jaeger APIs / collector port reference — https://www.jaegertracing.io/docs/latest/apis/
- Jaeger deployment documentation — https://www.jaegertracing.io/docs/latest/deployment/
- OpenTelemetry Collector configuration docs — https://opentelemetry.io/docs/collector/configuration/
- OTLP exporter documentation (collector core)

## Issues Found
1. **OTLP exporter pointed at Jaeger's native gRPC port (14250).** The `otlp/jaeger` exporter was configured with `endpoint: jaeger:14250`. Port 14250 on Jaeger serves the legacy `jaeger.api_v2.CollectorService` (Jaeger native protobuf over gRPC), not OTLP, so an OTLP exporter cannot speak to it. With `COLLECTOR_OTLP_ENABLED=true` (which the compose file already sets), Jaeger all-in-one accepts OTLP gRPC on port 4317. Changed the endpoint to `jaeger:4317` and added a brief inline comment explaining the requirement.
2. **Healthcheck hit a non-existent path on the collector.** The Docker `healthcheck.test` wgets `http://localhost:13133/health/status`, but the v1 `health_check` extension defaults to path `/` (returning HTTP 200 with a JSON body) and the post does not configure a custom `path`. As written the healthcheck would always 404 and mark the container unhealthy. Changed the URL to `http://localhost:13133/` to match the default path of the configured extension.

## Review Notes
- The `jaeger` receiver in the contrib distribution is officially deprecated by the OpenTelemetry project (announced in 2024); it still ships and works, but new deployments should prefer the OTLP receiver. Acceptable for a guide that is explicit about ingesting from "legacy Jaeger clients."
- The `prometheus` receiver uses `docker_sd_configs` but the compose file does not bind-mount `/var/run/docker.sock` into the collector container. To actually scrape via Docker service discovery, the user would need to add `/var/run/docker.sock:/var/run/docker.sock:ro` to the collector's `volumes`. Worth flagging to readers but left unchanged because the post may intend this as a starting point users adapt to their own environment.
- The `resource` processor entry `key: host.name, from_attribute: host.name, action: insert` is effectively a no-op (copies `host.name` onto itself only when missing). Harmless but provides no real value.
- The `pprof` extension is configured at `0.0.0.0:1888`; the upstream default endpoint is `localhost:1777`. The custom port is valid configuration, just non-standard.
- The Grafana datasources file references a Tempo instance and a `loki` UID that are not part of the compose stack; this is fine as an illustrative example but readers will need to add those services if they want the Tempo/Loki linking to function.
- The collector's `jaeger` receiver binds gRPC on `0.0.0.0:14250` inside its own container. That is not exposed to the host (and would conflict with Jaeger's own 14250 mapping if it were), so external Jaeger gRPC clients cannot reach the collector — only in-network containers can. Not an error, but a deployment caveat worth knowing.
