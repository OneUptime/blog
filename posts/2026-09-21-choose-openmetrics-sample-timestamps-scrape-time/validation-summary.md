# Validation Summary: How to Choose OpenMetrics Sample Timestamps or Prometheus Scrape Time

## Status
validated

## Post Type
Technical guide containing OpenMetrics exposition examples, a PromQL expression, and Prometheus scrape configuration.

## Technologies Covered
- OpenMetrics 1.0 text exposition and sample timestamps
- Prometheus text exposition format 0.0.4
- Prometheus scrape configuration, staleness tracking, and time-series ingestion
- PromQL freshness queries
- YAML configuration

## Sources Consulted
- [OpenMetrics 1.0 specification](https://prometheus.io/docs/specs/om/open_metrics_spec/) — timestamp units, sample grammar, metadata, optional created timestamps, and precision considerations.
- [Prometheus exposition formats](https://prometheus.io/docs/instrumenting/exposition_formats/) — traditional text timestamp encoding and OpenMetrics support.
- [Prometheus configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/) — scrape configuration fields, timestamp defaults, staleness tracking, and the out-of-order window.
- [PromQL functions](https://prometheus.io/docs/prometheus/latest/querying/functions/) — `time()` and `timestamp()` semantics.
- [PromQL querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/#staleness) — sample selection, lookback, and stale series.
- [Prometheus instrumentation practices](https://prometheus.io/docs/practices/instrumentation/#timestamps-not-time-since) — exposing event timestamps and calculating elapsed time in queries.
- [Prometheus jobs and instances](https://prometheus.io/docs/concepts/jobs_instances/) — the meaning of `up`.
- [Prometheus TSDB append implementation](https://github.com/prometheus/prometheus/blob/main/tsdb/head_append.go) — identical duplicates, conflicting values, and out-of-order acceptance.
- [Prometheus OpenMetrics parser](https://github.com/prometheus/prometheus/blob/main/model/textparse/openmetricsparse.go) — conversion of exposition timestamps to integer milliseconds.
- [Author profile](https://github.com/nawazdhandala) — verified that the post's author URL redirects to the intended profile.

## Issues Found
No technical issues found.

## Review Notes
- Both OpenMetrics examples conform to the documented sample syntax: metadata precedes samples, labels are properly quoted, optional sample timestamps follow values, and each exposition ends with `# EOF`. The seconds unit suffix matches the timestamp-valued gauge's metadata. Omitted UNIT metadata is permitted and represents an empty unit.
- Confirmed that OpenMetrics timestamps use Unix seconds and allow fractional values, whereas traditional text 0.0.4 requires integer milliseconds. The recommendation to omit ordinary sample timestamps and the distinction between gauge values, sample timestamps, and counter creation time are accurate.
- The freshness expression computes elapsed seconds from the gauge value. `time()` uses the query evaluation time, while `timestamp()` returns the selected sample's timestamp. Re-scraping an unchanged event-time gauge therefore does not reset the age of the underlying event.
- The YAML structure and configuration keys match the current reference. `honor_timestamps` defaults to true, and `track_timestamps_staleness` defaults to false. Staleness tracking handles disappearance or scrape failure; it does not refresh an old observation.
- Repeating the latest timestamp with exactly the same float value is accepted without a duplicate-value error. A different value at that timestamp is rejected. Older samples depend on the configured ingestion window. The post's conditional warning is accurate; it does not state that every repeated timestamp fails.
- The inspected OpenMetrics parser converts timestamps to integer milliseconds. Nanosecond text precision therefore does not imply nanosecond storage precision, supporting the post's recommendation to verify the destination.
- Source freshness and scrape availability are separate: `up` reports scrape success, not whether an upstream sensor recently produced a measurement. Query lookback also limits how long old explicitly timestamped samples remain selectable.
- The discussion explicitly references OpenMetrics 1.0 and traditional text 0.0.4. The exposition documentation also lists OpenMetrics 2.0 as a draft; that does not invalidate these version-specific examples.
- All external links in the post resolved to the intended resources. There are no terminal commands or deprecated APIs in the post.
- Review was based on official documentation, the formal exposition grammar, and upstream implementation inspection. No live gateway or Prometheus instance was exercised, and `promtool` was unavailable locally. The README required no edits during this review.
