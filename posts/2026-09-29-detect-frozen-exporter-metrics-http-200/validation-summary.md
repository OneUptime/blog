# Validation Summary: How to Detect a Silent Exporter That Returns HTTP 200 but Serves Frozen Metrics

## Status
validated

## Post Type
Technical troubleshooting and instrumentation guide.

## Technologies Covered
- Prometheus exporter instrumentation and text exposition format
- PromQL timestamp functions, comparisons, and vector matching
- Prometheus alerting rules and YAML rule files
- Scrape health, service discovery, and time-series staleness

## Sources Consulted
- [Prometheus instrumentation guidance](https://prometheus.io/docs/practices/instrumentation/) — last-success timestamps, offline progress, collection errors, and duration metrics.
- [Prometheus jobs and instances](https://prometheus.io/docs/concepts/jobs_instances/) — automatic target labels and the meaning of `up`.
- [Prometheus exposition formats](https://prometheus.io/docs/instrumenting/exposition_formats/) — HELP/TYPE declarations, gauge samples, labels, and optional sample timestamps.
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/) — `time()`, `timestamp()`, and `changes()` semantics.
- [Prometheus query operators](https://prometheus.io/docs/prometheus/latest/querying/operators/) — filtering comparisons, scalar/vector arithmetic, `and`, `unless`, and `on` matching.
- [Prometheus configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/) — `honor_timestamps` and scrape timestamp handling.
- [Prometheus alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/) — rule-file structure, labels, annotations, and pending duration.
- [Prometheus querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/#staleness) — lookback and disappearing target/metric behavior.
- [Author GitHub profile](https://github.com/nawazdhandala) — verified the author link resolves to the intended profile.

## Issues Found
No technical issues found.

## Review Notes
- Reviewed all snippets against official documentation; README.md required no changes. The post contains no terminal commands or version-specific API claims, and the demonstrated PromQL features are not deprecated.
- The exposition example correctly stores Unix seconds as a gauge value, distinct from the optional exposition sample timestamp. Publishing that value with its cached snapshot preserves the intended freshness contract.
- The alert YAML has the documented rule-file structure. The stale-data expression retains each source series while checking successful scraping by job and instance. Set operators support this matching without a group modifier. The absence expression correctly checks whether any freshness series exists for each healthy target; the post explicitly addresses its inability to detect individual missing sources.
- Successful scraping can continue to record unchanged values. Sample timestamps therefore cannot establish upstream collection freshness under scrape-time timestamping. `changes()` only reports observed value changes; sparse samples also limit what a zero result proves.
- A target removed from discovery disappears from instant query results after staleness handling, rather than necessarily at the exact moment of removal. Independent expected inventory is appropriate for detecting this case. The sample-age query likewise stops returning a series once it becomes stale or falls outside lookback.
- The 180-second threshold and two-minute pending period imply approximately five minutes from the last successful collection to firing under continuous successful scrapes, with evaluation scheduling and subsequent notification delivery adding latency.
- Clock skew, first-collection startup behavior, valid unchanged snapshots, upstream failures, and semantic progress are correctly identified as separate validation concerns. Missing metadata must not be treated as proof of healthy idleness.
- The three linked Prometheus documentation pages and the author profile resolved successfully. Validation was documentation-based: `promtool` is not installed, and no live exporter failure simulation was performed.
