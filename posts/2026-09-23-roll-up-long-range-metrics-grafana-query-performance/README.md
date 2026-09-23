# How to Roll Up Long-Range Metrics Without Making Grafana Queries Slow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Grafana, Thanos, Recording Rules

Description: Reduce long-range query work with meaningful recording rules, appropriate sample resolution, and explicit retention policies while preserving useful drill-down data.

A 30-day panel can return only 1,000 points and still scan millions of underlying samples. Reducing the number of pixels on the screen does not necessarily reduce the number of series selected or the work performed inside each query evaluation.

Plan rollups along two separate dimensions: fewer label combinations and fewer samples over time. A recording rule usually addresses the first; a downsampling backend can address the second. Both require deciding what information the dashboard needs to retain.

## Measure the expensive part

Start with the actual query sent by Grafana, its evaluation step, and the number of selected series. Compare a one-hour and a 30-day request with the same filters. Look for broad selectors, repeated expensive subqueries, and panels that calculate the same intermediate expression independently.

As a sizing illustration, 20,000 series sampled every 15 seconds contain about 3.46 billion samples over 30 days before storage and query optimizations. Returning 1,000 display points does not make those source dimensions disappear.

Grafana's Prometheus editor exposes range-query controls such as minimum step and supports `$__rate_interval`. Inspect how these settings expand for the selected time range instead of assuming every panel uses a fixed five-minute rate window. [Grafana Prometheus query editor](https://grafana.com/docs/grafana/latest/datasources/prometheus/query-editor/)

## Record reusable aggregates

If the overview needs traffic by cluster and service, record that level explicitly:

```yaml
groups:
  - name: service_overview
    interval: 1m
    rules:
      - record: cluster_service:http_requests:rate5m
        expr: |
          sum by (cluster, service) (
            rate(http_requests_total{job="application"}[5m])
          )
```

The panel now selects a small number of derived series:

```promql
cluster_service:http_requests:rate5m
```

Calculate rates before combining counters. Give the recording a name that communicates its grouping and operation. A recording rule stores its evaluation result; it does not cause raw inputs to disappear, and it does not automatically backfill older time ranges. [Recording-rule configuration](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/), [rule naming practices](https://prometheus.io/docs/practices/rules/)

Place the rule where `cluster` exists on the input data. If cluster identity is attached only as an external label during remote write, a local Prometheus rule will not see it in the same way a central backend rule does.

## Preserve components needed for later mathematics

Store duration sums and observation counts when future dashboards need a weighted mean. Store histogram buckets or native histograms when they need service-wide percentiles. Recording a p99 value once per minute does not preserve the distribution needed to calculate the p99 of a whole day.

For example, a classic histogram rollup retains `le`:

```promql
sum by (cluster, service, le) (
  rate(http_request_duration_seconds_bucket[5m])
)
```

A later `histogram_quantile()` can combine compatible bucket rates at that evaluation time. Averaging a sequence of p99 values answers a different question. State the five-minute window in the panel description so users understand what a point on a 30-day graph represents.

Similarly, an hourly maximum gauge and an hourly mean are different products. Choose the statistic based on whether the panel supports capacity planning, peak detection, or typical behavior.

## Add temporal downsampling where supported

Thanos Compactor can create five-minute and one-hour representations of older blocks. Its documented age thresholds are 40 hours for five-minute downsampling and 10 days for one-hour downsampling. Configure retention so each input resolution survives long enough to produce the next one. [Thanos Compactor downsampling](https://thanos.io/tip/components/compact.md/#downsampling)

An illustrative retention policy is:

```text
--retention.resolution-raw=30d
--retention.resolution-5m=90d
--retention.resolution-1h=365d
```

These flags belong to an otherwise configured Compactor deployment. They express different historical detail levels, not a guarantee of storage savings. Keeping downsampled blocks alongside raw blocks adds storage, and the retained aggregates themselves consume space.

Thanos Query's `max_source_resolution` controls the coarsest input resolution it may use. Its API accepts raw-only `0`, `5m`, `1h`, or `auto`; automatic behavior also depends on Query configuration. Verify that Grafana's data source actually requests the intended resolution. [Thanos Query downsampling parameters](https://thanos.io/tip/components/query.md/#auto-downsampling)

## Keep overview and investigation paths usable

Use rollups for the long-range overview, then link to a shorter raw-data view for an individual service or instance. This avoids forcing every historical panel to retain every pod label while still supporting incidents inside the raw retention period.

Compare overlapping raw and rolled-up windows before switching a dashboard. Check totals, units, counter resets, missing evaluation intervals, and short spikes. Expected differences should follow from the selected resolution, not from accidentally summing replicas or averaging per-instance ratios.

Track rule evaluation duration and missed evaluations as the rollup inventory grows. Expensive rules move work from interactive queries into scheduled evaluation; they do not make that work free. A successful rollout reduces both response time and backend work while leaving the dashboard's measurement contract understandable.
