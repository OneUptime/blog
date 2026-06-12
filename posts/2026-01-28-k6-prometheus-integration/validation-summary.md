# Validation Summary: How to Use k6 with Prometheus

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- k6
- Prometheus remote write
- Prometheus native histograms and PromQL
- StatsD and prometheus/statsd_exporter
- Grafana dashboards
- Docker Compose
- Python prometheus-client and Pushgateway

## Sources Consulted
- Grafana k6 Prometheus remote write documentation: https://grafana.com/docs/k6/latest/results-output/real-time/prometheus-remote-write/
- Grafana k6 StatsD output documentation: https://grafana.com/docs/k6/latest/results-output/real-time/statsd/
- Grafana k6 JSON output documentation: https://grafana.com/docs/k6/latest/results-output/real-time/json/
- Grafana k6 environment variables documentation: https://grafana.com/docs/k6/latest/using-k6/environment-variables/
- Grafana k6 built-in metrics reference: https://grafana.com/docs/k6/latest/using-k6/metrics/reference/
- Grafana k6 tags and groups documentation: https://grafana.com/docs/k6/latest/using-k6/tags-and-groups/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus native histograms specification: https://prometheus.io/docs/specs/native_histograms/
- Prometheus Python client Pushgateway documentation: https://prometheus.github.io/client_python/exporting/pushgateway/
- prometheus/statsd_exporter documentation: https://github.com/prometheus/statsd_exporter

## Issues Found
- The remote write run command used `-e K6_PROMETHEUS_RW_*` flags. In k6, `-e/--env` passes variables to the script and does not configure k6 options, so the command would not configure the Prometheus remote write output. Changed these examples to set system environment variables before `k6 run`.
- The post referred to enabling a Prometheus remote write "extension" and a command line flag for the server URL. The current k6 documentation presents this as an experimental output configured by environment variables. Updated the wording.
- The custom `Rate` metric example only recorded failed requests, making `rate<0.05` incorrect because successes were never recorded as `0`. Changed it to record `errorRate.add(!success)` for every checkout attempt.
- Custom counter names included `_total`, but k6 remote write adds the Prometheus counter suffix itself. Renamed the custom counters to avoid doubled `_total_total` Prometheus series names.
- The StatsD command used the removed built-in k6 StatsD output. Current k6 removed it in v0.55.0, so the post now shows building k6 with `xk6-output-statsd` and running `--out output-statsd`.
- The StatsD mapping treated `http_req_duration` as precomputed quantile series. Updated it to map the timer metric to a histogram in `statsd_exporter`.
- The Python Pushgateway example created metrics in the default registry but pushed `registry=None`, so it would not reliably push the intended custom metrics. Added a `CollectorRegistry`, registered the metrics with it, incremented the request counter, and pushed that registry.
- The Grafana and alerting PromQL used classic histogram `_bucket`, `_sum`, and `_count` series while the k6 examples enabled Prometheus native histograms. Updated the queries to use native histogram syntax and `k6_http_req_failed_rate` for k6's rate metric.
- The Docker Compose Prometheus config mounted an alerts file but did not load it, and included a self-referential `remote_write` block that is not needed for receiving k6 remote write data. Added `rule_files` and removed the self-write configuration.
- The Prometheus v2.48 example enabled remote write receiving but not native histograms, while the k6 examples enabled native histograms. Added the Prometheus `--enable-feature=native-histograms` flag.
- Updated the final Docker Compose command to use the current `docker compose` form and set the remote write native histogram environment variable consistently.

## Review Notes
- The Prometheus remote write output remains experimental in k6 documentation. Future k6 or Prometheus releases may change native histogram defaults or feature flags.
- The Grafana dashboard JSON remains an illustrative dashboard snippet rather than a fully provisioned Grafana dashboard export with layout metadata.
