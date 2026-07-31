# Validation Summary: Can Node Exporter Use Different CPU, Disk, and Network Scrape Intervals?

## Status
validated

## Post Type
Technical guide / configuration guide

## Technologies Covered
- Prometheus scrape configuration
- Prometheus Node Exporter
- Node Exporter collectors and request-time `collect[]` / `exclude[]` filtering
- PromQL, including `rate()`, `time()`, and `timestamp()`
- Prometheus metric relabeling
- Prometheus recording and alerting rules
- Alertmanager grouping and inhibition

## Sources Consulted
- [Node Exporter README: collectors and filtering enabled collectors](https://github.com/prometheus/node_exporter#collectors) - verified collector flags, default/optional collector guidance, collector names, and the repeated `collect[]` / `exclude[]` request parameters.
- [Node Exporter v1.11.1 request handler](https://github.com/prometheus/node_exporter/blob/v1.11.1/node_exporter.go) - verified request-time collector selection, rejection of combined `collect[]` and `exclude[]` parameters, exporter metric registration, and the `--web.disable-exporter-metrics` behavior.
- [Node Exporter v1.11.1 collector implementation](https://github.com/prometheus/node_exporter/blob/v1.11.1/collector/collector.go) - verified that filtered requests execute the selected enabled collectors and emit `node_scrape_collector_duration_seconds` and `node_scrape_collector_success`.
- [Node Exporter changelog](https://github.com/prometheus/node_exporter/blob/master/CHANGELOG.md) - checked the introduction history of `collect[]`, `exclude[]`, and current collector behavior.
- [Prometheus scrape configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config) - verified `job_name`, `scrape_interval`, `scrape_timeout`, `params`, `static_configs`, target labels, relabeling, and metric relabeling syntax and semantics.
- [Prometheus jobs and instances](https://prometheus.io/docs/concepts/jobs_instances/) - verified automatically attached `job` / `instance` labels and the generated `up`, `scrape_duration_seconds`, `scrape_samples_scraped`, and `scrape_samples_post_metric_relabeling` series.
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/) - verified `rate()`, `time()`, and `timestamp()` behavior and syntax.
- [Prometheus querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/#staleness) - verified instant-selector lookback and staleness behavior.
- [Prometheus recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/) - verified that rule evaluation cadence is independent of source scrape cadence.
- [Prometheus alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/) - verified the alert rule fields, PromQL expression, `for` duration, and annotation templating.
- [Alertmanager configuration](https://prometheus.io/docs/alerting/latest/configuration/) - verified grouping and inhibition behavior.
- [Prometheus v3.13.2 release](https://github.com/prometheus/prometheus/releases/tag/v3.13.2) - used its `promtool` binary to validate the complete scrape configuration and the alert rule fragment.

## Issues Found
1. **Two cross-collector examples used metrics from the same collector.** `node_filesystem_avail_bytes` and `node_filesystem_readonly` both come from `filesystem`, while network error and packet counters both come from `netdev`. Request-time filtering cannot put metrics from one collector on different cadences. Replaced those examples with filesystem fullness versus disk I/O utilization (`filesystem` versus `diskstats`) and network errors versus interface link speed (`netdev` versus `netclass`), which can genuinely be collected by separate jobs.
2. **Exporter process metrics were described as unconditional.** Process, Go runtime, and promhttp metrics are enabled by default, but Node Exporter can disable them with `--web.disable-exporter-metrics`. Clarified the default behavior and made the double-counting warning conditional on exporter self-metrics being enabled.
3. **The scrape example did not identify its operating-system scope.** The example includes Linux-only collectors such as `vmstat` and `netclass`; requesting an unavailable collector causes the filtered endpoint to reject the request. Marked the configuration as a Linux example.

## Review Notes
- The scrape configuration passes `promtool check config` with Prometheus v3.13.2.
- The alert rule fragment, when placed in a normal rule group, passes `promtool check rules` with Prometheus v3.13.2.
- The PromQL expressions and referenced metric names are current and syntactically valid.
- `exclude[]` was introduced in Node Exporter 1.9.0. Deployments older than 1.9.0 can use the post's `collect[]` approach but do not support `exclude[]`.
- Collector availability varies by operating system and build. Operators should confirm the enabled collector list for each deployed Node Exporter before applying a filtered scrape configuration.
