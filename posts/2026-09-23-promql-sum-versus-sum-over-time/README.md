# How to Aggregate Metrics with PromQL sum() and sum_over_time()

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Metric, Monitoring

Description: Separate aggregation across series from aggregation across samples, and choose queries that preserve the units and meaning of counters and gauges.

The word "total" is ambiguous in a monitoring dashboard. It might mean the current combined queue depth, the number of requests during an hour, or the sum of recorded measurements. PromQL has different operations for these questions, and substituting one for another can produce convincing but meaningless numbers.

Before writing the query, name its output unit. "Requests," "requests per second," and "queued items" describe different quantities. That simple step often reveals whether the proposed aggregation makes sense.

## Separate the two axes

`sum()` combines the values of different series at one evaluation time. `sum_over_time()` combines samples along each individual series over a selected interval. Neither operation automatically performs both jobs. Their input types reflect that distinction: an instant vector for the aggregation operator and a range vector for the range function. [PromQL operators](https://prometheus.io/docs/prometheus/latest/querying/operators/#aggregation-operators), [range functions](https://prometheus.io/docs/prometheus/latest/querying/functions/#aggregation_over_time)

Imagine this regularly sampled gauge:

| Time | Worker A queue | Worker B queue |
|---|---:|---:|
| 12:01 | 2 | 5 |
| 12:02 | 4 | 1 |
| 12:03 | 3 | 6 |

At 12:03, summing the two current queues gives `9`. Summing the three samples separately gives `9` for worker A and `12` for worker B. Combining those sample sums gives `21`; it is neither the current depth nor the number of items processed.

```promql
# Current combined queue depth
sum by (service) (worker_queue_depth)

# Sum of observed sample values, separately for each worker
sum_over_time(worker_queue_depth[3m])
```

The table is an illustration with three samples included in the chosen range. Actual range selectors exclude their left boundary and include their right boundary, so align synthetic examples with those rules. [PromQL range selectors](https://prometheus.io/docs/prometheus/latest/querying/basics/#range-vector-selectors)

## Use counter differences for events during a window

A cumulative counter might contain `100`, `110`, and `120`. Adding those samples produces `330`, although the visible increase is only `20`. Changing the scrape interval changes the sample sum again without changing the workload.

Use a counter-aware operation for an interval total:

```promql
sum by (service) (
  increase(http_requests_total[1h])
)
```

For a current traffic-rate graph, use:

```promql
sum by (service) (
  rate(http_requests_total[5m])
)
```

Both operate on individual counters before combining instances. This retains each process's reset history. A reset can disappear when counters are summed first: one process decreases while another increases. For example, a restart from `100` to `0` can be hidden by another process moving from `200` to `350`.

`increase()` estimates the increase over the requested window and may return fractional results because it extrapolates to window boundaries. Use it for operational estimates, with enough samples and suitable instrumentation. It is not an exact transaction ledger. The [counter function contract](https://prometheus.io/docs/prometheus/latest/querying/functions/#increase) documents this behavior.

## Decide what a gauge means over time

For queue depth, useful questions include typical observed depth and largest observed depth:

```promql
avg_over_time(worker_queue_depth[1h])
max_over_time(worker_queue_depth[1h])
```

To find the largest combined service depth, first combine workers at each time, then inspect those totals. A subquery supplies the required history of the expression:

```promql
max_over_time(
  (sum by (service) (worker_queue_depth))[1h:1m]
)
```

This evaluates the total on a one-minute grid. Shorter spikes between grid points can be missed. In contrast, summing each worker's maximum can add peaks that happened at different times and therefore never existed simultaneously.

An average of scraped gauge samples gives every sample equal weight. It is not automatically a duration-weighted average when sampling is irregular. Similarly, multiplying a sample sum by a nominal scrape interval is only an approximation to an integral and becomes misleading around missing samples or changing intervals.

## Use recording rules for repeated work

If several dashboards repeatedly calculate the same combined gauge, record that intermediate total:

```yaml
groups:
  - name: queue_totals
    interval: 1m
    rules:
      - record: service:worker_queue_depth:sum
        expr: sum by (service) (worker_queue_depth)
```

Then query:

```promql
max_over_time(service:worker_queue_depth:sum[1h])
```

The recording interval becomes part of the measurement's resolution. The new series begins when the rule starts evaluating; it does not automatically fill earlier history. [Recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)

Check a small time range against raw samples before publishing the panel. Verify the output labels, unit, expected sample count, and behavior when one worker disappears. A correct query should answer the same operational question after a scrape-interval change, even if its estimation error or temporal resolution changes.
