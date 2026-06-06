# Validation Summary: How to Configure the Prometheus Receiver for Metric Scraping

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Prometheus receiver
- Prometheus scrape configuration
- Prometheus service discovery
- Prometheus relabeling and metric relabeling
- Prometheus remote write
- Kubernetes service discovery

## Sources Consulted
- OpenTelemetry Collector Prometheus receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector logging exporter replacement announcement: https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus guide for using Prometheus as an OpenTelemetry backend: https://prometheus.io/docs/guides/opentelemetry/

## Issues Found
- The opening described the Collector as a drop-in replacement for Prometheus server. This was too broad because the Prometheus receiver is a scrape-compatible receiver and does not replace all Prometheus server features. Changed the wording to limit the claim to scraping workloads.
- The basic Collector example used the removed `logging` exporter and deprecated `loglevel` option. Updated it to the current `debug` exporter with `verbosity: normal`.
- Prometheus relabel replacement values containing `$1` and `$2` were not escaped for OpenTelemetry Collector configuration. Updated them to `$$1` and `$$2`, as required when embedding Prometheus configuration under the Collector's `prometheus` receiver.
- The Kubernetes pod annotation port example wrote to `__meta_kubernetes_pod_container_port_number`, which does not change the scrape address. Updated it to rewrite `__address__` using the discovered address and annotated port.
- The environment variable example used `${METRICS_USERNAME}` and `${METRICS_PASSWORD}`. Updated it to the current Collector documentation style, `${env:METRICS_USERNAME}` and `${env:METRICS_PASSWORD}`.
- The `sample_limit` explanation said it prevents scraping targets with excessive metrics. Prometheus fails a scrape that exceeds the limit, so the description was corrected.
- The DNS SRV discovery example included `port: 9090`, which is not appropriate for SRV records because the port comes from the SRV response. Removed the field and narrowed the surrounding explanation.
- The `labeldrop` metric relabel example incorrectly used `source_labels: [user_id]`. Updated it to use `regex: 'user_id'`, which is how `labeldrop` matches label names.
- The data-flow diagram placed relabeling after conversion to OTLP. Updated it to distinguish target relabeling before scraping and metric relabeling before OTLP conversion.
- The Collector internal telemetry example used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Updated it to the current `readers` pull Prometheus exporter configuration.
- Added a caveat that writing to a Prometheus server via remote write requires Prometheus to be started with `--web.enable-remote-write-receiver`.

## Review Notes
The post is technically relevant and contains substantial configuration examples. The examples are now aligned with current OpenTelemetry Collector and Prometheus documentation, but real deployments should still validate configuration against the exact Collector distribution and version they run.
