# Validation Summary: How to Fix the Common Mistake of Confusing OpenTelemetry Core

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Core distribution
- OpenTelemetry Collector Contrib distribution
- OpenTelemetry Collector configuration YAML
- OpenTelemetry Collector Builder (ocb)
- Docker and Docker Compose image references
- Kubernetes Helm chart values

## Sources Consulted
- OpenTelemetry Collector distributions documentation: https://opentelemetry.io/docs/collector/distributions/
- OpenTelemetry Collector Core distribution manifest: https://github.com/open-telemetry/opentelemetry-collector-releases/blob/main/distributions/otelcol/manifest.yaml
- OpenTelemetry Collector Contrib distribution manifest: https://github.com/open-telemetry/opentelemetry-collector-releases/blob/main/distributions/otelcol-contrib/manifest.yaml
- OpenTelemetry Collector Core v0.96.0 manifest: https://github.com/open-telemetry/opentelemetry-collector-releases/blob/v0.96.0/distributions/otelcol/manifest.yaml
- OpenTelemetry Collector Contrib v0.96.0 manifest: https://github.com/open-telemetry/opentelemetry-collector-releases/blob/v0.96.0/distributions/otelcol-contrib/manifest.yaml
- OpenTelemetry Collector Docker installation documentation: https://opentelemetry.io/docs/collector/install/docker/
- OpenTelemetry Collector Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
- OpenTelemetry Collector Helm chart values: https://github.com/open-telemetry/opentelemetry-helm-charts/blob/main/charts/opentelemetry-collector/values.yaml
- OpenTelemetry Collector Helm chart upgrade notes: https://github.com/open-telemetry/opentelemetry-helm-charts/blob/main/charts/opentelemetry-collector/UPGRADING.md
- OpenTelemetry Collector Builder documentation: https://opentelemetry.io/docs/collector/extend/ocb/
- Tail Sampling Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OTLP exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md

## Issues Found
- The post described Core as containing only OTLP receiver, batch and memory_limiter processors, and OTLP/debug exporters. That was inaccurate for both v0.96.0 and current manifests; Core includes a curated set that also contains selected Contrib components such as Prometheus, Jaeger, Zipkin, Kafka, hostmetrics, attributes, filter, resource, and file-related exporters. Updated the component lists to reflect the manifest-based distinction.
- The Contrib examples listed several components as if they were Contrib-only even though they are included in Core. Replaced them with clearer examples of components that are outside Core, such as tail_sampling, transform, filelog, cloud/database receivers, and backend-specific exporters.
- The failure-mode YAML omitted receiver and exporter definitions, and the OTLP exporter requires an endpoint. Added an OTLP receiver with an explicit gRPC endpoint and an OTLP exporter with endpoint and TLS settings so the example isolates the intended `tail_sampling` availability error.
- The component-listing command only showed `otelcol components`. Added `otelcol-contrib components` so users check the actual binary they are running.
- The Docker image examples used the old `0.96.0` version. Updated examples to current release-style GHCR image names and version `0.153.0`.
- The Helm section said the chart defaults to the Contrib image. Current chart values require an explicit image repository. Updated the text and values snippet to set the Contrib repository and `command.name`.
- The custom Collector Builder example used `v0.96.0` modules with `builder@latest`, which can create version skew. Updated the component versions and pinned the builder command to `v0.153.0`, added a `dist.module`, and included current config providers needed for file/env/YAML config loading.

## Review Notes
The post is technically relevant and useful after correction. The exact set of components in Core and Contrib changes over time, so future updates should continue to point readers at the distribution `manifest.yaml` files instead of treating inline component lists as exhaustive.
