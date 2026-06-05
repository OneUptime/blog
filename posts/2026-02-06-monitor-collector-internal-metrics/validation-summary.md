# Validation Summary: How to Monitor the Collector with Its Internal Metrics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector internal telemetry
- Prometheus scraping and PromQL
- Prometheus Remote Write exporter
- OpenTelemetry Collector health_check and zPages extensions
- Grafana dashboard queries

## Sources Consulted
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector memory_limiter processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector batch processor generated telemetry documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/documentation.md
- OpenTelemetry Collector Contrib Prometheus Remote Write exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- OpenTelemetry Collector Contrib health_check extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/healthcheckextension/README.md
- OpenTelemetry Collector zPages extension README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/extension/zpagesextension/README.md
- OpenTelemetry Collector Contrib tail_sampling processor generated telemetry documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/documentation.md
- OpenTelemetry Collector Contrib probabilistic_sampler processor generated telemetry documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/documentation.md

## Issues Found
- `service.telemetry.metrics.address` is ignored in modern Collector versions. Replaced it with the current `service.telemetry.metrics.readers` pull exporter configuration for Prometheus and set `without_type_suffix` and `without_units` to keep the metric names used in the PromQL examples.
- The `prometheusremotewrite` exporter type is deprecated as an alias. Updated examples to use `prometheus_remote_write` and updated pipeline references accordingly.
- The Prometheus Remote Write examples used an HTTP endpoint without TLS configuration. Added `tls.insecure: true` for the local HTTP endpoint examples.
- The Kubernetes Prometheus scrape example did not force scraping the Collector telemetry port. Added a relabel rule that sets `__address__` to the pod IP on port `8888`.
- Several metric examples used names that are not listed in current Collector internal telemetry documentation, including memory limiter memory limit metrics, retry queue length, runtime GC duration, and a tail sampling in-memory trace metric. Replaced them with current documented metrics.
- The post used `otelcol_processor_refused_spans` for memory limiter drops. Current official internal telemetry documentation describes receiver refused metrics and processor incoming/outgoing item metrics, so the examples now use receiver refusals for back-pressure detection and process memory metrics for memory pressure.
- The restart alert used `time() - otelcol_process_uptime < 300`, which does not correctly detect recent restarts. Replaced it with `otelcol_process_uptime < 300`.
- A raw counter check `otelcol_receiver_refused_spans > 0` would remain true after a single refusal until restart. Changed it to use `rate(...[5m]) > 0`.
- The health check extension example used `check_collector_pipeline`, which the current official README warns is not working as expected and recommends not using. Removed that option from the examples.
- The documented default health check response body was outdated. Updated it to the current default empty JSON object.
- Adjusted the general claim that all metrics follow semantic conventions; the post now states that Collector internal metrics use Collector internal metric names and can be exposed in Prometheus format.

## Review Notes
The Collector internal telemetry configuration schema is still under development according to the official docs, so future Collector releases may require another pass. The PromQL examples assume the Prometheus pull exporter is configured to preserve the shorter internal metric names without unit or type suffixes, which is now explicit in the post.
