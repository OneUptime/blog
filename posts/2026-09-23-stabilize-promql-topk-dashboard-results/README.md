# How to Keep `topk()` Results Stable Across Dashboard Time Ranges and Query Steps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Grafana

Description: Select one top-k population for a dashboard range, preserve its identities, and separate ranking windows from graph resolution.

---

A range query containing `topk(5, ...)` can draw many more than five lines. Prometheus evaluates the expression at every step, and a different set of five series can win at each timestamp. The chart contains the union of those winners.

To keep one population for the chart, rank once at a fixed timestamp and use that result to filter the changing values. Then decide whether the population should change when the user changes the dashboard range.

## Separate ranking from display

Suppose the chart displays request rate by service:

```promql
sum by (service) (rate(http_requests_total[5m]))
```

A five-minute rate is the displayed quantity. Ranking by traffic over the complete dashboard interval is a different calculation:

```promql
topk(
  5,
  sum by (service) (
    increase(http_requests_total[$__range] @ end())
  )
)
```

Grafana expands `$__range` before sending the query. Prometheus fixes `end()` to the end of the entire range query when used in the `@` modifier. The official [introduction to the modifier](https://prometheus.io/blog/2021/02/18/introducing-the-@-modifier/) demonstrates this fixed-ranking pattern.

Combine the expressions with set intersection:

```promql
sum by (service) (rate(http_requests_total[5m]))
  and on (service)
topk(
  5,
  sum by (service) (
    increase(http_requests_total[$__range] @ end())
  )
)
```

`and` preserves the left-hand values while retaining only services present in the right-hand result. It does not multiply rates by the ranking scores. Here, both sides intentionally identify a service with exactly the `service` label.

## Preserve enough identity

If the same service name occurs in multiple environments or clusters, keep those dimensions on both sides:

```promql
sum by (cluster, service) (rate(http_requests_total[5m]))
  and on (cluster, service)
topk(
  5,
  sum by (cluster, service) (
    increase(http_requests_total[$__range] @ end())
  )
)
```

This selects up to five cluster-service pairs overall. Adding `by(cluster)` to `topk` selects up to five pairs per cluster instead. The [operator reference](https://prometheus.io/docs/prometheus/latest/querying/operators/#topk-and-bottomk) distinguishes grouping the candidates from removing labels: `topk` retains the selected series' original labels.

Do not match on `service` alone after ranking cluster-service pairs. That can admit an unselected cluster because another cluster with the same service name won.

## Choose the stability you mean

The fixed endpoint makes membership stable within one returned chart. It does not freeze membership across all future refreshes. A rolling dashboard moves its end time, so the ranking may change. Changing from one hour to seven days also changes the population when `$__range` defines the score.

For membership independent of dashboard duration, use a fixed ranking window, such as one day, while keeping the ranking endpoint unchanged:

```promql
sum by (service) (
  increase(http_requests_total[1d] @ end())
)
```

Use this expression inside the same `topk` filter. For reproducible incident reports, freeze the dashboard's absolute start and end timestamps and use an explicit Unix timestamp in seconds in the ranking selector's `@` modifier to avoid step-dependent endpoint alignment. If identical membership must survive endpoint changes, save a reviewed service selection as a dashboard variable or configuration rather than recomputing the ranking every refresh.

Ties deserve an explicit product decision. Do not promise a meaningful business ordering between equal scores. When the fifth and sixth services have nearly identical traffic, small ingestion changes can swap them. A manually selected cohort can be more useful for a review than a ranking that changes at a narrow cutoff.

## Keep query steps from changing the question

The graph step determines how many displayed values are evaluated. With the ranking fixed at `end()`, changing the graph resolution does not independently rerank each step. However, [Grafana aligns the query time range to the step](https://grafana.com/docs/grafana/latest/datasources/prometheus/query-editor/), so a resolution change can move the actual query endpoint and change the cohort. To keep the ranking independent of that alignment, replace `@ end()` with the same explicit Unix timestamp in seconds in each query. Use a fixed display window such as `[5m]` when comparing values across panel sizes, ensuring it spans enough scrapes for a reliable rate.

Grafana's [`$__rate_interval`](https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/#use-__rate_interval) helps choose a sufficiently long rate window, but it can change with query resolution. That is useful for avoiding undersampled rates; it also means the displayed smoothing can change when zooming. Document whether the panel prioritizes fixed smoothing or automatic window sizing.

Ranking with an increase over the whole dashboard range can become expensive for long intervals. Restrict label selectors to the intended environment and metric. Recording rules can reduce dimensions for repeated rankings, but do not call `increase()` on a recording rule that already contains a per-second rate.

## Verify the cohort

Run the ranking as an instant query at the actual range-query endpoint, or at the explicit ranking timestamp if used, and save its labels. Keep the ranking timestamp and window identical when running the complete graph at two different steps, and check that the distinct returned identities are a subset of that set. The graph may contain fewer selected services at individual times, or across the entire graph, if a service did not yet exist or lacks enough samples in the displayed rate windows.

Those gaps should remain gaps. Filling them with zero would claim that an absent measurement means no traffic. A stable top-k chart provides consistent comparison subjects while preserving the actual coverage of their measurements.
