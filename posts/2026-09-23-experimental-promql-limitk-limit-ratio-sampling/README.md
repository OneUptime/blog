# How to Enable Experimental PromQL `limitk()` and `limit_ratio()` for Deterministic Series Sampling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Observability

Description: Enable deterministic PromQL series sampling, verify complementary subsets, and avoid treating sampled series as an exact fleet total.

---

`limitk()` and `limit_ratio()` select a deterministic subset of time series for inspection. They are useful when a dashboard or troubleshooting query needs a manageable cohort, but they do not reduce the number of series ingested into Prometheus.

The operators are experimental in the current [PromQL operator documentation](https://prometheus.io/docs/prometheus/latest/querying/operators/#aggregation-operators). Enable them in the engine that actually executes the query, and verify behavior against that deployed version.

## Enable the query engine feature

For a local Prometheus process:

```bash
prometheus \
  --config.file=prometheus.yml \
  --enable-feature=promql-experimental-functions
```

Add the feature to any existing comma-separated `--enable-feature` value instead of replacing unrelated enabled features. The [feature-flag documentation](https://prometheus.io/docs/prometheus/latest/feature_flags/#experimental-promql-functions) describes the gate. Command-line flags require changing the process configuration and restarting the process; reloading scrape configuration alone does not enable it.

Check the query path too. A local server may support the function while a remote query frontend, managed backend, or rule evaluator rejects it. In an HA setup, configure every query-serving replica consistently before relying on the expression in dashboards.

Use a small selected population for the first request:

```promql
limitk(5, process_resident_memory_bytes{job="workers"})
```

Without the necessary feature support, the query should produce a clear parser or feature error. Treat that as a deployment issue rather than silently replacing the expression with `topk`.

## Choose a fixed-size cohort

`limitk(k, vector)` returns up to `k` selected input series, preserving their labels and values:

```promql
limitk(10, process_resident_memory_bytes{job="workers"})
```

The selection is deterministic and independent of sample values. A worker does not enter the set just because its memory rises. Both floats and native histogram samples are eligible.

Grouping can select a cohort for each cluster:

```promql
limitk by (cluster) (
  10,
  process_resident_memory_bytes{job="workers"}
)
```

This can return up to ten series per cluster rather than ten overall. Specify enough identity labels to avoid confusing two clusters whose workers have similar names.

Repeated queries over the same identities retain a predictable selection, but changing the available population can change the fixed-size cohort. Instance churn, relabeling, and changing selectors all matter. Do not treat this operator as a permanent assignment system for deployment canaries.

## Choose a proportional cohort

For approximately ten percent of matching series:

```promql
limit_ratio(0.1, process_resident_memory_bytes{job="workers"})
```

The count is approximate, particularly for small populations. A service with five workers is not guaranteed to contribute one worker. The operator samples series, not requests, users, bytes, or CPU seconds.

A complementary selection uses a negative ratio:

```promql
limit_ratio(-0.9, process_resident_memory_bytes{job="workers"})
```

For the same input at the same evaluation time, this selects the complement of the positive 0.1 selection. The negative sign reverses the selection order; `-0.1` is not the requested complement of `0.1`.

Verify disjointness with set intersection:

```promql
limit_ratio(0.1, process_resident_memory_bytes{job="workers"})
  and
limit_ratio(-0.9, process_resident_memory_bytes{job="workers"})
```

The result should be empty. Their union should recover the original input identities. Run these checks at a fixed timestamp so live target churn does not change the population between requests.

## Keep sampling separate from estimation

Summing a ten-percent sample and multiplying by ten is not an exact fleet total. A few large processes can dominate memory, and a deterministic series sample may omit them. Likewise, selecting ten percent of histogram series does not select ten percent of observations when instances handle different traffic volumes.

Use the full population for SLOs, billing, fleet capacity totals, and correctness-sensitive alerts. For exploratory charts, label the panel with the sampling policy and selected population count. If a statistical estimate is required, design its sampling and uncertainty model explicitly rather than assuming proportional series selection solves it.

`topk` remains appropriate for finding the largest current consumers. `limitk` answers a different question: show a bounded cohort without ranking by the observed value.

## Check costs and upgrade behavior

Sampling limits the result set after Prometheus has found the candidate series. It does not automatically eliminate selector evaluation or storage reads. Add restrictive matchers, inspect query latency, and avoid claiming that returning ten lines makes a million-series query cheap.

Before an upgrade, run the fixed-population checks against the candidate engine. Experimental behavior can change, and other PromQL implementations can differ. Keep these expressions in exploratory dashboards until their operational role and engine support are clear, then monitor errors and cohort size so an unsupported query cannot quietly remove visibility.
