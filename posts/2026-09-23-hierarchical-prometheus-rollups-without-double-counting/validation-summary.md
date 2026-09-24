# Validation Summary: How to Build Hierarchical Prometheus Rollups Without Double Counting

## Status

validated

## Post Type

Technical guide with PromQL examples, YAML recording rules, and a CLI command.

## Technologies Covered

- Prometheus recording rules and rule groups
- PromQL rates, aggregation, vector matching, and set operators
- promtool rule validation
- High-availability remote-write collection and deduplication
- Classic histograms, request error ratios, and latency averages

## Sources Consulted

- [Prometheus recording-rule configuration](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/) — YAML fields, sequential evaluation, shared evaluation timestamps, query offsets, and skipped evaluations.
- [Prometheus configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/) — loading rule files through `rule_files`.
- [Prometheus recording-rule best practices](https://prometheus.io/docs/practices/rules/) — naming conventions and aggregation of ratios and averages.
- [PromQL functions](https://prometheus.io/docs/prometheus/latest/querying/functions/) — counter reset handling, per-second rates, rate-before-sum ordering, and classic histogram quantiles.
- [PromQL operators](https://prometheus.io/docs/prometheus/latest/querying/operators/) — retained labels, subtraction, vector matching, and `unless`.
- [PromQL querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/) — metric-name selectors, lookback, and staleness.
- [Prometheus HTTP API](https://prometheus.io/docs/prometheus/latest/querying/api/#instant-queries) — explicit instant-query evaluation timestamps.
- [promtool CLI reference](https://prometheus.io/docs/prometheus/latest/command-line/promtool/) — `promtool check rules` syntax and arguments.
- [Prometheus histograms and summaries](https://prometheus.io/docs/practices/histograms/) — sum/count averages and aggregation before percentile calculation.
- [Grafana Mimir HA deduplication](https://grafana.com/docs/mimir/latest/configure/configure-high-availability-deduplication/) — authoritative backend example of deduplicating redundant Prometheus replica streams.
- [Author GitHub profile](https://github.com/nawazdhandala) — verified the author link destination.

## Issues Found

1. **Conservation checks did not explicitly require the recording cycle's exact evaluation timestamp.** Merely choosing a time after the cycle finishes can compare a fresh five-minute raw rate with a previously recorded rate. Updated the existing paragraph to require the cycle's exact evaluation timestamp, account for any rule query offset, and explain why a later timestamp can produce a misleading difference. This follows the documented instant-selector lookback and rule evaluation semantics.

## Review Notes

- Reviewed all three recording rules: the first applies `rate()` to individual counters before summing; subsequent rules consume only their preceding layer and remove the intended dimensions. All layers retain requests-per-second units.
- The YAML fields, metric names, 30-second interval, five-minute range selectors, dashboard query, subtraction, and set-difference query are valid according to the official syntax. No deprecated API or version-specific feature is required by the examples.
- Default vector matching is appropriate for the shown rules because both comparison operands have the same service and status labels. Both directions of `unless` are needed to check coverage.
- Distinct metric names separate raw counters from recorded rates, but cannot by themselves prevent duplicate replica contributions. The HA and migration guidance correctly requires disjoint ownership or deduplication.
- The ratio, classic histogram `le` preservation, and sum/count guidance is correct. Actual histogram deployments also need compatible bucket boundaries across contributors.
- Missed evaluations can leave absent samples, and instant selectors may reuse older non-stale samples within the lookback period. The monitoring guidance correctly distinguishes these concerns.
- The two linked Prometheus documentation pages and author profile resolve to the intended resources.
- Validation was documentation-based. `promtool` is not installed in the review environment, so the CLI command was verified against its official reference but was not executed. No live Prometheus deployment or HA failover test was performed.
