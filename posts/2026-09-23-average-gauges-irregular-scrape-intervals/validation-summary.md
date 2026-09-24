# Validation Summary: How to Average Gauges over Irregular Scrape Intervals Without Bias

## Status
validated

## Post Type
Technical guide with PromQL query examples.

## Technologies Covered
- Prometheus gauge and counter metrics
- PromQL range functions, subqueries, comparisons, set operators, and aggregation
- Scrape freshness, staleness, and monitoring coverage
- Time averages and accumulated occupancy instrumentation

## Sources Consulted
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/): aggregation over time, `time()`, `timestamp()`, `increase()`, and `rate()`.
- [Prometheus querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/): selectors, subquery syntax, default resolution, lookback, and staleness.
- [Prometheus operators](https://prometheus.io/docs/prometheus/latest/querying/operators/): comparison filtering, vector matching, `and`, scalar division, and `sum by`.
- [Prometheus jobs and instances](https://prometheus.io/docs/concepts/jobs_instances/): scrape-generated `up` and target labels.
- [Prometheus metric types](https://prometheus.io/docs/concepts/metric_types/): gauge and counter semantics.
- [Prometheus query engine source](https://github.com/prometheus/prometheus/blob/main/promql/engine.go): range sample boundary filtering.
- [Author profile](https://github.com/nawazdhandala): verified the post's author link resolves to the expected profile.

## Issues Found
1. **Incorrect implication about the default subquery resolution.** The original wording implied that omitting the resolution could let dashboard pixel width determine it. Prometheus defaults an omitted resolution to its global evaluation interval. Corrected this and distinguished an explicit dashboard-provided resolution variable.
2. **Freshness boundary wording.** The `< 90` comparison rejects samples exactly 90 seconds old, not just older samples. Updated the explanation to match the expression; the queries were already correct.
3. **Exactness of integration from sampled data.** Timestamp-aware integration can be exact for an interpolation model without being exact for the underlying process. Clarified that unobserved state changes cannot be recovered.
4. **Integral-derived PromQL estimates.** Added the relevant boundary-extrapolation qualification for `increase()` and `rate()`, so an accurately instrumented integral is not confused with an exact arbitrary-window PromQL result.

## Review Notes
- Reviewed all four fenced PromQL examples against official syntax and type rules. No deprecated or experimental functions are required. No terminal commands, configuration snippets, or explicit version claims appear in the post.
- Confirmed the example arithmetic: equal sample counts produce `(10 + 100) / 2 = 55`; elapsed-time weighting produces `(10 * 9 + 100 * 1) / 10 = 19`.
- The regular grid approximates a time average using held observations. It cannot reconstruct between-scrape spikes, and freshness filtering changes the result to an average over accepted coverage.
- The freshness expression preserves gauge values through `and`; the comparison must remain a filtering comparison without `bool`.
- The nominal coverage denominator is `3600 / 30 = 120`. Retained the existing instruction to verify complete-window counts and engine boundary behavior before setting a hard coverage threshold. If a series has no accepted points anywhere in the window, its count and average are absent rather than zero; expected-series inventory is needed to identify completely missing series.
- Aggregating partitioned queues before averaging is appropriate for the desired fleet quantity. The existing membership, missing-worker, and duplicate-reporter caveats are necessary. Queue identity must be represented by the grouping labels used in the deployment.
- An occupancy integral has units of jobs multiplied by seconds; dividing its increase by elapsed seconds yields jobs. Instrumentation must include elapsed occupancy through collection time, including periods without state changes.
- The post's documentation links point to the relevant official pages, and the author link resolves correctly.
- Validation was a documentation and source review, not execution against a live Prometheus dataset. No runtime query-test results are claimed.
