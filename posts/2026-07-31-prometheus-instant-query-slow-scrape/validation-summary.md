# Validation Summary: Why Does a Prometheus Instant Query Return No Data for Slowly Scraped Infrastructure Metrics?

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Prometheus
- PromQL
- Prometheus scrape configuration
- Prometheus alerting rules
- Prometheus HTTP API
- Infrastructure gauges, info metrics, and counters
- Staleness and query lookback behavior

## Sources Consulted

- [Prometheus querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/) — instant and range selectors, subqueries, lookback, and staleness
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/) — `last_over_time`, `present_over_time`, `absent_over_time`, `max_over_time`, `timestamp`, `time`, `vector`, and `rate`
- [Prometheus operators](https://prometheus.io/docs/prometheus/latest/querying/operators/) — `or`, `unless`, vector matching, comparison filtering, and `group`
- [Prometheus configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/) — `scrape_interval`, `scrape_timeout`, `honor_timestamps`, and `track_timestamps_staleness`
- [Prometheus HTTP API](https://prometheus.io/docs/prometheus/latest/querying/api/) — query `lookback_delta`, target status, loaded configuration, and flag endpoints
- [Prometheus command-line reference](https://prometheus.io/docs/prometheus/latest/command-line/prometheus/) — `--query.lookback-delta` and its five-minute default
- [Prometheus jobs and instances](https://prometheus.io/docs/concepts/jobs_instances/) — generated `up` series and scrape health semantics
- [Prometheus recording and alerting rule configuration](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/) — rule-file syntax and `promtool` validation
- [Prometheus rule unit testing](https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/) — PromQL behavior tests, missing samples, and stale markers

## Issues Found

- The post used a plain instant selector for `up` in the scrape-failure check, the expected-target side of the missing-metric alert, and the final availability example. For a ten-minute scrape interval and five-minute lookback, `up` itself disappears between scrapes, which can reset or suppress the alert. The failure and availability checks now use `last_over_time(up[25m])`, and the missing rule now uses `present_over_time(up[25m])`.
- The post stated that the sample-age expression existed only while a source sample remained inside the nominal subquery range. Each inner instant selector also applies the ordinary lookback, so the expression can survive for almost one additional lookback period. The explanation now documents that behavior and still explains why a separate missing-data rule is required.
- The scrape-failure section implied that increasing lookback would return an old ordinary application sample after a failed scrape. Normal scrape-timestamped series receive stale markers, and lookback does not override them. The text now distinguishes that behavior from cases where timestamp staleness is not tracked.
- The global-lookback warning was too broad about failed collection. It now specifies that a longer lookback can hide delayed collection or failures for which staleness is not tracked.
- The `infrastructure_asset_info or vector(0)` explanation only described the empty-left-side case. Because `or` unions unmatched label sets, an unlabeled zero can also appear alongside labeled metric series. The text now states both behaviors.

## Review Notes

- The Prometheus configuration and the two revised alert rules pass `promtool` syntax checks with Prometheus 3.13.2.
- PromQL unit tests confirmed the five-minute instant-selector gap, range-selected `up` behavior, stale-marker handling, the age subquery's effective lifetime, the derived timestamp from `timestamp(last_over_time(...))`, the minimum-sample behavior of `rate`, and the unmatched zero produced by `or vector(0)`.
- The age query uses stable PromQL functions. Prometheus also has `ts_of_last_over_time`, but it remains behind `--enable-feature=promql-experimental-functions`, so retaining the documented subquery approach avoids requiring an experimental feature.
