# Validation Summary: How to Use the File Provider for Dynamic Collector Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- Collector configuration providers / file provider
- Collector configuration reload with SIGHUP
- Collector exporters, processors, pipelines, and internal telemetry
- Tail sampling processor
- Prometheus Remote Write exporter
- zPages extension
- GitOps-style configuration deployment

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector file provider source: https://github.com/open-telemetry/opentelemetry-collector/blob/main/confmap/provider/fileprovider/provider.go
- OpenTelemetry Collector Builder documentation for provider inclusion: https://github.com/open-telemetry/opentelemetry-collector/blob/main/cmd/builder/README.md
- OpenTelemetry Collector issue documenting SIGHUP reload support: https://github.com/open-telemetry/opentelemetry-collector/issues/10264
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry guidance for migrating away from the Jaeger exporter: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- OpenTelemetry Collector Contrib Prometheus Remote Write exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- OpenTelemetry Collector Contrib tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector Contrib v0.153.0 binary validation with `otelcol-contrib validate`

## Issues Found
- The post described a top-level `providers:` Collector configuration block with `enabled`, `poll_interval`, and `paths`. That is not a valid OpenTelemetry Collector runtime configuration block. Updated the article to use the supported `file:` config URI and embedded `${file:...}` configuration fragments.
- The post claimed the file provider watches files or directories and automatically reloads changes. The current file provider reads files; reload is performed by Collector reload support, such as sending SIGHUP. Updated the explanation, commands, diagrams, deployment scripts, and conclusion to describe validation plus SIGHUP reload instead of automatic polling.
- Several examples showed complete external files under top-level keys such as `exporters:` and then implied they would be loaded automatically from a watched directory. Updated the examples so referenced files contain the fragment expected at the interpolation point, such as exporter maps under `exporters: ${file:...}` and pipeline maps under `service.pipelines: ${file:...}`.
- The Jaeger exporter example used the removed native `jaeger` exporter. Updated it to `otlp/jaeger`, matching OpenTelemetry guidance that Jaeger supports OTLP and official distributions include the OTLP exporter.
- The Prometheus Remote Write exporter used the deprecated `prometheusremotewrite` alias. Updated it to `prometheus_remote_write`.
- The internal telemetry example used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Updated it to the current `readers.pull.exporter.prometheus` configuration.
- The environment variable example used `${CONFIG_VERSION:-unknown}`. Updated it to the Collector's provider syntax `${env:CONFIG_VERSION:-unknown}`.
- Validation scripts validated partial fragment files one at a time, which would fail or give misleading results. Updated scripts to validate the merged main Collector configuration.

## Review Notes
- I validated representative updated configurations with OpenTelemetry Collector Contrib v0.153.0 using `otelcol-contrib validate`.
- The post now correctly treats dynamic changes as validated file-backed configuration reloads, not automatic directory watching.
