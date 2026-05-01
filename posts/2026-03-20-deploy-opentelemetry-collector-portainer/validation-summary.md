# Validation Summary: How to Deploy OpenTelemetry Collector via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry Collector
- Portainer
- Docker Compose / Portainer stacks
- OTLP (gRPC and HTTP)
- Prometheus
- Jaeger
- Zipkin

## Sources Consulted
- OpenTelemetry Collector Docker install docs: https://opentelemetry.io/docs/collector/install/docker/
- OpenTelemetry Collector exporters registry: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry OTLP SDK environment variable configuration: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry blog on Jaeger exporter migration: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- OpenTelemetry Collector Contrib releases: https://github.com/open-telemetry/opentelemetry-collector-contrib/releases
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Portainer Docker services docs: https://docs.portainer.io/user/docker/services

## Issues Found
- The post used the deprecated `logging` exporter in the sample config. I replaced it with the current `debug` exporter because current official Collector docs use `debug`, and `logging` is no longer listed as a current exporter component.
- The post suggested a native `jaeger` exporter. I replaced that example and the related "Next Steps" guidance with OTLP-to-Jaeger guidance because official Collector distributions no longer include native Jaeger exporters.
- The sample deployment pinned `otel/opentelemetry-collector-contrib:0.96.0`, which was significantly outdated by the review date. I updated it to `0.151.0` to match the current documented release line.
- The collector config only defined `traces` and `metrics` pipelines even though the post describes the collector as handling traces, metrics, and logs. I added a `logs` pipeline so the sample configuration matches the article's claims.
- The application environment variable examples changed only the endpoint port and did not set the OTLP protocol. I added `OTEL_EXPORTER_OTLP_PROTOCOL` for both HTTP and gRPC because protocol defaults are SDK-dependent and endpoint alone is not reliably sufficient.
- The Prometheus scrape guidance assumed collector self-metrics were reachable on `otel-collector:8888`, but current internal telemetry defaults expose metrics on `127.0.0.1:8888`. I added an explicit `service.telemetry.metrics.readers.pull.exporter.prometheus` configuration bound to `0.0.0.0:8888` so the scrape example works from another container.
- The Portainer scaling section implied that replicated Compose deployments can be scaled through Portainer's scaling controls. I corrected this to note that Portainer service-scaling controls apply to Docker Swarm services.
- The `8889` port comment implied an active Prometheus exporter. I clarified that this port is only relevant if the Prometheus exporter is enabled.

## Review Notes
- The example remains a Docker Standalone-oriented stack (`bridge` network and `restart: unless-stopped`). For multi-replica production deployments in Portainer, a Swarm-based service deployment is the relevant scaling path.
- Publishing port `8889` is harmless, but it is unused until a Prometheus exporter is added to the collector pipelines.
