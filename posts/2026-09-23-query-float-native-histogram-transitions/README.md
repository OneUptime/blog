# How to Query a Series That Transitions from Float Samples to Native Histograms Without Silent Omissions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Monitoring

Description: Identify mixed sample types during histogram migrations and build queries that expose omissions instead of hiding missing data.

---

Prometheus can store float samples and native histogram samples under the same metric name and label set at different timestamps. That flexibility makes some migrations possible, but functions do not all handle a mixed range the same way. A graph can show a gap, a partial calculation, or no obvious error, depending on the function.

Treat a type transition as a metric-contract change. Inspect the stored types and query annotations before interpreting a missing result as zero traffic.

## Inspect the raw window

Fetch a range vector through an instant query to see samples surrounding a known deployment:

```bash
curl -fsSG http://localhost:9090/api/v1/query \
  --data-urlencode 'query=request_work{instance="worker-1:8080"}[30m]' \
  --data-urlencode 'time=2026-09-23T10:30:00Z' \
  | jq '{warnings, infos, data}'
```

In the [API result format](https://prometheus.io/docs/prometheus/latest/querying/api/#range-vectors), float and histogram samples have separate representations. A series can include both `values` and `histograms`. Their timestamps reveal whether the transition falls inside the range the dashboard calculates.

The example name deliberately makes no claim that an arbitrary old float is equivalent to the histogram's sum or count. Determine what the original measurement meant before designing a fallback. An old latency gauge, a counter of completed work, and a counter of elapsed seconds require different comparisons.

## Know the function's behavior

The [PromQL function reference](https://prometheus.io/docs/prometheus/latest/querying/functions/) documents the relevant distinctions:

| Function family | Mixed float and histogram behavior |
| --- | --- |
| `rate`, `increase`, `delta` | Omit a mixed series from the result and attach a warning |
| `sum_over_time`, `avg_over_time` | Omit a mixed series and attach a warning |
| `count_over_time`, `present_over_time`, `last_over_time` | Handle both sample types |
| `deriv` and several other float-only calculations | Use float samples in mixed ranges with an informational annotation |
| Instant-vector functions such as `abs` | Ignore histogram samples |

This table is a starting point, not a blanket rule for every function. In particular, `irate` and `idelta` examine the last two samples for their calculation. A mixed pair causes omission, whereas an earlier sample of another type need not determine their result.

## Detect the missing calculation

If a counter-like metric is expected to support a five-minute rate, compare presence with rate availability:

```promql
present_over_time(request_work[5m])
  unless
rate(request_work[5m])
```

This identifies series with recent samples but no rate result. It also catches insufficient samples and other causes of missing rates, so it is an investigation query rather than a definitive type-transition detector. Match the same label filters in both operands.

Inspect annotations directly:

```bash
curl -fsSG http://localhost:9090/api/v1/query \
  --data-urlencode 'query=rate(request_work[5m])' \
  | jq '{warnings, infos, result: .data.result}'
```

Do not use `or vector(0)` to cover the gap. That changes an invalid or absent calculation into a success-looking zero and usually loses the affected series' labels.

## Prefer separate identities during migration

Publish the new histogram under a new metric name or an explicit bounded schema label. This keeps a rate window homogeneous and lets old and new dashboards be compared without relying on function-specific omission behavior.

If the old metric counts completed operations and the new histogram records exactly one observation per completed operation, their comparable scalar rates are:

```promql
rate(completed_operations_total[5m])
```

```promql
histogram_count(rate(operation_duration_seconds[5m]))
```

Those expressions have compatible units only under the one-observation-per-operation contract. The histogram sum measures elapsed seconds, so it is not an alternative request count.

When both representations describe the same traffic, select an authoritative one per producer rather than adding them. If they describe disjoint producers during rollout, combine the scalar rates after verifying the identity labels and population boundaries.

## Handle a transition already in storage

For a historical report, split the evaluation interval at the known transition and apply an appropriate expression to each homogeneous segment. Rate calculations still need enough samples on each side. Events between the last old scrape and first new scrape may not be recoverable exactly.

A shorter range can temporarily avoid the transition, but it changes smoothing and may leave too few samples. It is not a durable repair for dashboards whose users can choose any range. Long windows will continue encountering the transition until it ages out or the query explicitly separates formats.

If the old float values and the new histogram describe different quantities, display a documented break in the chart. Joining them into one continuous curve would imply a comparison the data cannot support.

## Check downstream rules too

A recording rule can successfully evaluate yet omit the affected series. A second aggregation may then total the remaining instances, making service traffic appear smaller rather than absent. Compare expected producers against observed producers and monitor the rule's own health separately.

Test the migration with windows wholly before, wholly after, and spanning the type change. Check raw presence, per-instance calculations, service totals, and API annotations. A correct migration makes the meaning and coverage of every returned value explicit, including intervals that cannot be calculated reliably.
