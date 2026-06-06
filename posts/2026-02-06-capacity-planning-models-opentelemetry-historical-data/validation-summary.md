# Validation Summary: How to Build Capacity Planning Models from OpenTelemetry Historical Resource

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Python Metrics API
- OpenTelemetry semantic conventions for system and process metrics
- OpenTelemetry Collector hostmetrics receiver
- OpenTelemetry Collector Prometheus Remote Write exporter
- Prometheus HTTP API and PromQL
- Thanos Receive and Compactor
- Python, NumPy, pandas, statsmodels, psutil

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry system metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/system/system-metrics/
- OpenTelemetry process metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/system/process-metrics/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector hostmetrics receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry Collector Prometheus Remote Write exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus storage and remote write receiver documentation: https://prometheus.io/docs/prometheus/latest/storage/
- Thanos Receive documentation: https://thanos.io/v0.17/components/receive.md/
- Thanos Compactor documentation: https://thanos.io/v0.20/components/compact.md/

## Issues Found
- The utilization examples recorded CPU and memory as 0-100 percentages while the forecast threshold used 0.75. Updated the OpenTelemetry instruments to use unit `1` and record fractional 0.0-1.0 values, matching OpenTelemetry semantic conventions and the forecast math.
- The Python metrics snippet referenced `hostname` and `service_name` without defining them, and used the less explicit `metrics.Observation` form. Added concrete placeholder definitions and imported `CallbackOptions` and `Observation` as shown in the official Python documentation.
- The memory utilization sample omitted the recommended `system.memory.state` attribute. Added `system.memory.state: used`.
- The Prometheus remote write endpoint example omitted that Prometheus must have its remote write receiver enabled. Added a configuration comment noting `--web.enable-remote-write-receiver`.
- The Thanos comment implied Receive alone handles downsampling and retention. Clarified that Receive ingests remote write and Compactor handles downsampling and retention.
- The Prometheus query helper did not set a timeout or check HTTP errors. Added `timeout=30` and `raise_for_status()`.
- The forecast examples could fail when a service had no data or a flat/decreasing trend. Added guards for missing results and stable trends, and adjusted the print statement to avoid indexing `None`.
- The seasonality snippet used `datetime`, `timedelta`, and `np` without importing them in that code block. Added the missing imports.

## Review Notes
The guide is technically valid after the fixes. The examples remain simplified for a blog post: real capacity models should usually aggregate across all relevant time series for a service, account for deployments and autoscaling events, and treat host, container, and process metrics separately when services share infrastructure.
