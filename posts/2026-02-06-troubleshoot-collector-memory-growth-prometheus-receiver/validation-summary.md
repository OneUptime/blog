# Validation Summary: How to Troubleshoot Collector Memory Growth Over Days Caused by the Prometheus

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Prometheus receiver
- Prometheus scrape configuration
- Prometheus relabeling and metric relabeling
- Kubernetes service discovery
- OpenTelemetry Collector filter processor

## Sources Consulted
- OpenTelemetry Collector Prometheus receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- Prometheus scrape configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus jobs and instances documentation: https://prometheus.io/docs/concepts/jobs_instances/
- OpenTelemetry Collector filter processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/filterprocessor

## Issues Found
- The post treated `prometheus_tsdb_head_series` as a Prometheus receiver metric exposed by the Collector. That metric belongs to a Prometheus server TSDB, not the Collector receiver. I changed the troubleshooting and alert examples to use `scrape_series_added` for scrape churn and `otelcol_process_memory_rss` for Collector memory.
- The post described `scrape_series` on the Collector internal metrics endpoint as a way to check active series. Prometheus documents `scrape_series_added` as the approximate number of new series in each scrape, not an active-series count, and the Collector internal endpoint is for Collector telemetry such as process memory. I updated the wording and command accordingly.
- The post said `honor_timestamps` helps with staleness. Prometheus documents `honor_timestamps` as controlling whether target timestamps are respected; `track_timestamps_staleness` controls staleness tracking for explicit timestamps. I added `track_timestamps_staleness: true` and corrected the explanation.
- The filter processor section implied it fixes receiver-side accumulation. The filter processor runs after scraping, so it reduces downstream/exported volume but is not the first choice for reducing scrape-time receiver state. I changed the section wording to make that caveat explicit.
- The receiver state explanation incorrectly tied stored last values to cumulative-to-delta conversion. I changed it to describe scrape cache and series lifecycle state without claiming the receiver performs cumulative-to-delta conversion for this purpose.

## Review Notes
The remaining Prometheus scrape configuration fields (`kubernetes_sd_configs`, `relabel_configs`, `metric_relabel_configs`, `sample_limit`, and `track_timestamps_staleness`) match the current Prometheus scrape configuration schema supported by the OpenTelemetry Collector Prometheus receiver. The filter processor example uses the documented include/exclude metric-name matching syntax.
