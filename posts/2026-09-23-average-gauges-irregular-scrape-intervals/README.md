# How to Aggregate Gauges over Irregular Scrape Intervals Without Biasing the Average

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Monitoring

Description: Reduce sample-density bias in gauge averages with fixed-grid subqueries and explicit freshness and coverage policies.

---

`avg_over_time()` calculates the mean of collected samples. It does not give a sample more weight because it represents a longer period of time. If scrape frequency changes, a heavily sampled interval contributes more heavily to the result even when the underlying process spends equal time in two states.

For an approximate time average, evaluate the gauge on a regular grid first. For an exact time integral, instrument the accumulated quantity or use a calculation that explicitly incorporates timestamps and a chosen interpolation policy.

## Define the quantity you want

Consider a queue that stays near 10 jobs for nine minutes and near 100 jobs for one minute. If ten samples are collected during each state, the sample average is 55 jobs. Under a piecewise-constant model, the time average is 19 jobs.

Both calculations answer real questions, but only the second describes the average queue occupancy across those ten minutes. Prometheus explicitly documents equal sample weighting for the [aggregation-over-time functions](https://prometheus.io/docs/prometheus/latest/querying/functions/#aggregation_over_time), including irregularly spaced samples.

Before changing a query, choose whether the result should weight elapsed time, targets, capacity, or observations. A time average of one target is different from the average of a changing population of targets.

## Evaluate a regular time grid

A subquery evaluates an instant expression repeatedly with a specified resolution:

```promql
avg_over_time(queue_depth{queue="billing"}[1h:30s])
```

The colon is significant. `queue_depth[1h]` reads the original samples, while `queue_depth[1h:30s]` evaluates the instant selector at regular 30-second steps over an hour. The latter approximates a time-weighted average by giving each grid point equal weight.

The [subquery syntax](https://prometheus.io/docs/prometheus/latest/querying/basics/#subquery) describes the independent resolution. Specify it explicitly so dashboard pixel width does not silently become the definition of the calculation.

At each step, the instant selector selects a recent sample according to lookback and staleness behavior. This is effectively a bounded hold of the last usable observation, not linear interpolation. It cannot recover a brief spike that happened entirely between scrapes.

## Bound how long an observation remains valid

For a frequently changing gauge, allowing the default lookback to carry a value too far into a scrape outage may be misleading. Add an explicit freshness condition:

```promql
avg_over_time(
  (
    queue_depth{queue="billing"}
      and
    (
      time() - timestamp(queue_depth{queue="billing"}) < 90
    )
  )[1h:30s]
)
```

The comparison filters away points older than 90 seconds. Because the same selector appears on both sides of `and`, the labels align. Choose the threshold relative to the actual collection interval and expected delivery delay.

This policy does not turn missing grid points into zero. The average uses the remaining points, so it becomes an average over observed coverage. The [lookback and staleness rules](https://prometheus.io/docs/prometheus/latest/querying/basics/#staleness) still matter: a series can disappear sooner because of a stale marker.

## Show coverage alongside the average

For a one-hour window on a 30-second grid, nominal coverage is 120 evaluations. Count accepted grid samples using the same freshness expression:

```promql
count_over_time(
  (
    queue_depth{queue="billing"}
      and
    (
      time() - timestamp(queue_depth{queue="billing"}) < 90
    )
  )[1h:30s]
) / 120
```

Treat this as a practical coverage measure for the chosen grid. Boundary alignment and the query engine's subquery evaluation must be considered when checking an exact expected count. Inspect a known complete interval before setting a hard threshold.

A report might require at least 95% coverage before displaying an average. Keep the missing-data condition visible instead of reducing missing periods to zero occupancy. `up` can help identify scrape failures, but a successful scrape does not guarantee that every expected gauge was exported.

## Aggregate targets in the right order

If each worker reports its own queue partition, the average total backlog is:

```promql
avg_over_time(
  (sum by (queue) (queue_depth))[1h:30s]
)
```

Apply the intended freshness and coverage policy before accepting each total. If a worker vanishes, summing the remaining workers produces a smaller total, which can look healthy while data is missing.

If multiple exporters report the same shared queue depth, first deduplicate the observations according to a documented ownership policy. Adding duplicate reporters and then averaging over time preserves the double count.

The order matters when membership changes. Summing each target's independently calculated hourly average can weight a worker that existed for ten minutes as if it existed for the whole hour. Evaluating the desired fleet quantity at each grid point usually gives a clearer contract.

## Use instrumentation for stronger accuracy

When the application knows every state change, it can maintain an accumulated queue-depth-times-seconds counter. The increase in that integral divided by elapsed seconds estimates average occupancy without depending on scrape density, subject to counter resets and collection coverage.

Keep the ordinary gauge for current-state debugging and compare the integral-derived result against the grid approximation on controlled workloads. For a dashboard, the grid approach is often sufficient; for capacity accounting, the instrumented integral provides a more defensible measurement than assigning guessed durations to irregular scrapes.
