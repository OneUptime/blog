# How to Total Counter Increases over a Grafana Dashboard Range

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Grafana

Description: Build a Grafana total for the selected dashboard range using per-series counter increases and a single endpoint evaluation.

---

To show requests completed during the selected Grafana range, calculate each counter's increase over that range and evaluate the expression once at the range endpoint. Summing raw counter samples or adding the values of a rolling-increase graph answers a different question.

A total panel needs a clear interval, an appropriate counter, and a single final calculation. The graph's pixel width should not determine how many requests the panel reports.

## Use the dashboard range as the lookback

For a Stat panel showing requests by service:

```promql
sum by (service) (
  increase(http_requests_total[$__range])
)
```

Grafana replaces `$__range` with a duration based on the dashboard's selected interval. The [Prometheus variable documentation](https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/) includes range-aware query patterns, and the [global variable reference](https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/global-variables/) describes the built-in range variables.

Configure the query as **Instant** for this panel. The expression then returns one value per service at the endpoint Grafana sends. Inspect the Query Inspector to verify the expanded duration and evaluation timestamp, especially when panel time overrides or time shifts are enabled.

Use a total-style unit such as requests or a plain count. Requests per second would mislabel the result, because `increase()` returns an estimated count over an interval rather than a rate.

## Apply reset handling before summing

Each instance has its own counter lifetime:

```promql
sum(
  increase(http_requests_total{job="api",status=~"5.."}[$__range])
)
```

This counts server errors across the selected instances after handling each series' resets. Aggregating raw counters before computing the increase can hide one process's reset behind another process's growth.

Prometheus documents [`increase()`](https://prometheus.io/docs/prometheus/latest/querying/functions/#increase) as a counter calculation with extrapolation to the requested boundaries. Fractional results are expected even if the source increments in whole requests. A rounded panel is a display decision, not evidence that the underlying calculation is an exact transaction count.

Confirm that the selected metric is actually a counter. Applying `increase()` to a queue-depth gauge interprets ordinary decreases as resets and produces an invalid operational total.

## Avoid overlapping window totals

Consider a one-hour dashboard whose graph evaluates `increase(counter[1h])` once per minute. Each returned point represents a different trailing hour. Adding those values counts much of the same traffic repeatedly and includes traffic before the displayed start at the earlier points.

The same mistake can occur when a Stat panel reduces a range query with a “Total” calculation. Use an instant query for one whole-range total rather than relying on a reducer over many overlapping results.

If a panel must show both a time series and a selected-range total, use separate queries with clear roles. A request-rate curve can use `rate(counter[$__rate_interval])`; the total query should use `increase(counter[$__range])` once. The [rate interval guidance](https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/#use-__rate_interval) concerns reliable rate windows, not the definition of the dashboard total.

## Reproduce the calculation outside Grafana

For a selected six-hour range ending at a known time:

```bash
curl -fsSG http://localhost:9090/api/v1/query \
  --data-urlencode 'query=sum by (service) (increase(http_requests_total[6h]))' \
  --data-urlencode 'time=2026-09-23T12:00:00Z' \
  | jq '{warnings, infos, result: .data.result}'
```

This isolates query semantics from panel transformations. Compare the result with the Stat panel using the same selectors, timestamp, and backend. Differences can come from panel overrides, timezone display, stale cached responses, or selecting a different data source.

Changing the time-series panel's maximum data points should not change this instant total. Changing the dashboard time range changes the interval being measured, although the resulting total can remain the same.

## Account for missing and short-lived series

A counter needs enough samples for a rate or increase estimate. A process that starts, handles requests, and disappears between scrapes can contribute no observable counter history. A newly discovered series may not reveal events that occurred before its first sample.

Inspect scrape health and expected producer coverage separately. An empty result is not automatically zero traffic. Avoid unconditional `or vector(0)` when it would hide missing collection or introduce an unlabeled zero alongside service-labeled results.

If instances are scraped by multiple HA collectors into the queried backend, deduplicate them before interpreting the total. Summing identical replicas correctly computes the sum of the input series but incorrectly counts the same requests more than once.

## Handle long-range performance deliberately

A month-long increase across many raw instances may be expensive. Restrict selectors and check retention before broadening the query. A recording rule of five-minute rates can help trend panels, but applying `increase()` to those rates is invalid because they are already derived per-second values.

For high-volume long-term reports, design a supported rollup or reporting pipeline with explicit intervals and coverage. Verify its totals against raw-counter queries for a representative retained period. The final panel should state whether it represents an estimate from scraped counters and should preserve evidence of missing data instead of turning every unavailable interval into a reassuring zero.
