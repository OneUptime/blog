# Validation Summary: How to Use Podman with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- OpenTelemetry Collector
- OpenTelemetry Go SDK
- OpenTelemetry Python SDK
- Prometheus
- Grafana
- Loki
- Jaeger

## Sources Consulted
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector Docker install docs: https://opentelemetry.io/docs/collector/install/docker/
- OpenTelemetry Collector transform docs: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry semantic conventions for HTTP: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry service attributes registry: https://opentelemetry.io/docs/specs/semconv/attributes-registry/service/
- OpenTelemetry deployment attributes registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry Python exporter docs: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry zero-code docs: https://opentelemetry.io/docs/concepts/instrumentation/zero-code/
- Jaeger getting started docs: https://www.jaegertracing.io/docs/latest/getting-started/
- Grafana Loki OTLP ingestion docs: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Grafana Loki with OpenTelemetry Collector docs: https://grafana.com/docs/enterprise-logs/latest/send-data/otel/
- Podman `run` documentation: https://docs.podman.io/en/v4.4/markdown/podman-run.1.html
- Docker Compose services reference for bind mount access modes and SELinux options: https://docs.docker.com/reference/compose-file/services/

## Issues Found
- The post mounted the OpenTelemetry Collector contrib config file at `/etc/otelcol/config.yaml`, but the contrib image expects `/etc/otelcol-contrib/config.yaml`. I corrected the bind mount path in both the `podman run` example and the Compose stack.
- The collector config used `service.telemetry.metrics.address`, which current collector docs state is ignored as of Collector `v0.123.0`. I replaced it with the current `service.telemetry.metrics.readers` Prometheus pull configuration.
- The “complete observability stack” included Loki, but the collector logs pipeline exported only to `debug`. I added an `otlphttp/loki` exporter pointed at Loki’s OTLP endpoint and wired the logs pipeline to it.
- The Compose bind mounts did not include SELinux relabel options even though the post is specifically about Podman. I added `:Z` to the bind mounts used by the collector, Prometheus, and Grafana examples.
- The Go example used older HTTP semantic-convention attribute names (`http.method` and `http.path`). I updated them to `http.request.method` and `url.path`.
- The collector pipeline patterns snippet declared `processors:` twice inside one YAML block, which makes the example invalid YAML. I merged those into one `processors` section.
- The transform example used the deprecated `deployment.environment` attribute and treated resource semantic attributes as ordinary span attributes. I updated the example to set `resource.attributes["deployment.environment.name"]` and `resource.attributes["service.namespace"]`.
- The environment-variable section described the snippet as “zero-code configuration”, but environment variables alone do not instrument an application. I narrowed the wording so it applies when an SDK or auto-instrumentation agent is already present, and I made the trace exporter selection explicit with `OTEL_TRACES_EXPORTER=otlp`.

## Review Notes
- The examples still use `:latest` image tags. They are technically valid, but pinning versions would make the tutorial more reproducible.
- Loki OTLP ingestion depends on a current Loki release. Grafana documents that older Loki versions require `allow_structured_metadata: true`; the post now aligns with the current `grafana/loki:latest` behavior.
