# Validation Summary: How to Use the Collector as a Prometheus Scraper During Migration

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Prometheus receiver
- Prometheus scrape configuration and Kubernetes service discovery
- OTLP exporter
- Prometheus Remote Write exporter
- Metrics Transform processor
- Debug exporter
- Health Check and zPages extensions
- OpenTelemetry Operator Target Allocator

## Sources Consulted
- OpenTelemetry Collector Prometheus receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- OpenTelemetry Collector Prometheus Remote Write exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- OpenTelemetry Collector Metrics Transform processor README: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/metricstransformprocessor
- OpenTelemetry Collector exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector logging-to-debug exporter migration announcement: https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- OpenTelemetry Target Allocator documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/target-allocator/
- OpenTelemetry Collector zPages extension README: https://pkg.go.dev/go.opentelemetry.io/collector/extension/zpagesextension
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/

## Issues Found
- The post said labels under `static_configs` become OTLP resource attributes. I changed this to metric attributes on OTLP data points; the Prometheus receiver maps ordinary Prometheus labels to metric attributes, while resource attributes come from sources such as `target_info` and scrape target metadata.
- The Kubernetes relabeling example replaced `__address__` with only the annotated port. I changed it to combine the existing host address with the annotated port and escaped the replacement variables as `$${1}:$${2}` for Collector configuration parsing.
- The post said resource or attributes processors can rename metrics. I changed the guidance to use the Metrics Transform processor for metric renaming, and resource/attributes processors for attribute changes.
- The Metrics Transform processor example used the older `metricstransform` component ID. I changed it to the current `metrics_transform` ID from the upstream processor README.
- The Prometheus Remote Write exporter example used the deprecated `prometheusremotewrite` component ID. I changed it to `prometheus_remote_write` and updated the pipeline reference.
- The remote write text implied a normal Prometheus server endpoint would work by default. I added the caveat that Prometheus needs its remote write receiver enabled, or users should point the exporter at a compatible remote write endpoint such as Thanos Receive, Cortex, or Mimir.
- The validation example used the removed `logging` exporter. I changed it to the current `debug` exporter with `verbosity: detailed`.
- The zPages description said PipelineZ shows how many data points flow through each pipeline stage. I changed it to say PipelineZ shows running pipelines and their receivers, processors, and exporters, matching the zPages documentation.
- The target allocator snippet included local Kubernetes service discovery while saying the Collector points to the allocator instead of doing local service discovery. I simplified the snippet to use only `target_allocator`, matching the receiver and Operator target allocator documentation.

## Review Notes
The examples were reviewed against current upstream documentation as of 2026-06-06. I could not run `otelcol validate` locally because no `otelcol` or `otelcol-contrib` binary was installed in the workspace environment.
