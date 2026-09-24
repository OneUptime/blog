# Validation Summary: How to Aggregate Metrics with PromQL sum() and sum_over_time()

## Status
validated

## Post Type
Technical guide with PromQL examples and a recording-rule configuration.

## Technologies Covered
- Prometheus
- PromQL aggregation operators, range functions, and subqueries
- Counter and gauge metrics
- Prometheus recording rules and YAML configuration

## Sources Consulted
- [PromQL aggregation operators](https://prometheus.io/docs/prometheus/latest/querying/operators/#aggregation-operators)
- [PromQL range functions](https://prometheus.io/docs/prometheus/latest/querying/functions/#aggregation_over_time)
- [PromQL increase](https://prometheus.io/docs/prometheus/latest/querying/functions/#increase)
- [PromQL rate](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate)
- [Range vector selectors](https://prometheus.io/docs/prometheus/latest/querying/basics/#range-vector-selectors)
- [Subqueries](https://prometheus.io/docs/prometheus/latest/querying/basics/#subquery)
- [Staleness and lookback behavior](https://prometheus.io/docs/prometheus/latest/querying/basics/#staleness)
- [Recording-rule configuration](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Backfilling recording rules](https://prometheus.io/docs/prometheus/latest/storage/#backfilling-for-recording-rules)
- [Author GitHub profile](https://github.com/nawazdhandala)

## Issues Found
No technical issues found.

## Review Notes
- Reviewed every PromQL expression against the documented input types and syntax. The aggregation grouping, duration selectors, comments, and parenthesized subquery are valid. No deprecated or experimental functions are used.
- Verified the table arithmetic: current combined depth is 9; the worker sample sums are 9 and 12, totaling 21. The counter samples sum to 330 while their visible increase is 20. The reset example correctly shows a combined counter rising from 300 to 350 despite one worker resetting.
- Confirmed that counter functions precede aggregation, account for observable resets, and extrapolate. The five-minute rate expresses requests per second; increase estimates requests over the hour. These are operational estimates rather than exact accounting.
- Confirmed per-series gauge averages and maxima, equal sample weighting, and the distinction between sample sums and time integrals. The examples concern ordinary numeric gauges and counters.
- Confirmed left-exclusive, right-inclusive range boundaries and the explicit one-minute subquery resolution. Instant selectors use the latest eligible sample under lookback and staleness rules; combined values need not come from perfectly synchronized scrapes. The post appropriately recommends checking disappearing workers and temporal resolution.
- Verified the recording-rule YAML fields, indentation, metric name, and expression against the documented rule-file format. The one-minute interval controls evaluation frequency; historical results require explicit backfilling. As a rule-file excerpt, it assumes the file is loaded by the Prometheus configuration.
- Checked the referenced documentation destinations and author profile. The post makes no version-specific claims and contains no terminal commands.
- Review was based on official documentation and manual syntax and arithmetic checks; queries were not executed against a live Prometheus server. README.md required no changes.
