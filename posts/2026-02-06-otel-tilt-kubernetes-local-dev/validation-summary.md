# Validation Summary: How to Use OpenTelemetry with Tilt for Kubernetes Local Development

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python SDK and OTLP gRPC exporter
- OpenTelemetry Collector
- Jaeger all-in-one
- Tilt
- Kubernetes
- Flask
- Docker

## Sources Consulted
- OpenTelemetry Python exporter documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python OTLP exporter API documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector exporter documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector receiver/exporter configuration examples: https://opentelemetry.io/docs/collector/building/receiver/
- Tilt installation documentation: https://docs.tilt.dev/install.html
- Tiltfile API reference: https://docs.tilt.dev/api.html
- Tilt Live Update reference: https://docs.tilt.dev/live_update_reference.html
- Tilt resource dependencies documentation: https://docs.tilt.dev/resource_dependencies.html
- Jaeger deployment documentation: https://www.jaegertracing.io/docs/1.76/deployment/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

## Issues Found
- The Tilt Live Update example used `run('pip install -r requirements.txt', trigger='requirements.txt')`. Tilt runs Live Update commands from `/`, so the command should use the synced container path. Tilt triggers are also relative to the Tiltfile and must match synced files. Changed it to `run('pip install -r /app/requirements.txt', trigger='./service-a/requirements.txt')`.

## Review Notes
- The main Kubernetes manifests, Tiltfile examples, OpenTelemetry Python tracing setup, Collector OTLP pipeline, and Jaeger all-in-one OTLP configuration are technically valid for a local development tutorial.
- The Jaeger image tag in the post is pinned to `jaegertracing/all-in-one:1.54`, which is older than current Jaeger releases but still compatible with the OTLP all-in-one pattern shown.
- Live Update syncs files into the running container; application code changes still need an app-level reload mechanism or a restart step to take effect if the process does not reload files automatically.
