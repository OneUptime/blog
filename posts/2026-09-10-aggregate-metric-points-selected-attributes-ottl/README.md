# Aggregate Metric Points by Attributes Without Identity Conflicts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpenTelemetry Collector, OTTL, Observability, Troubleshooting

Description: Use aggregate_on_attributes to combine metric data points after reducing dimensions while respecting resources, temporality, and aggregation boundaries.

Deleting a metric label can create two measurements with the same remaining identity. If you intended a total, merely removing the label does not calculate that total. Use a metric-level aggregation function and verify that the source measurements can meaningfully be combined.

This guide targets OpenTelemetry Collector Contrib **0.160.0** and `aggregate_on_attributes`. The function works within the current metric object. It is not a stateful service that combines independent requests, resources, or arbitrary time windows.

## Start with an Additive Measurement

Suppose one metric contains current queue occupancy by region and worker:

```text
Metric: example.queue.depth, type=Gauge
region=eu, worker=a, value=3
region=eu, worker=b, value=5
region=us, worker=c, value=2
```

If each worker owns disjoint work, summing by region gives `eu=8` and `us=2`. If every worker reports the same shared queue total, summing would double-count it. Establish the measurement's meaning before editing its dimensions.

Resource and instrumentation scope identity also matter. Two services with the same metric name are not automatically one aggregation group. The [OpenTelemetry metric data model](https://opentelemetry.io/docs/specs/otel/metrics/data-model/) explains the distinction between metric streams and their data point attributes.

## Aggregate While Selecting the Remaining Keys

Use the metric function to retain the region and combine points:

```yaml
processors:
  transform/queue_by_region:
    error_mode: ignore
    metric_statements:
      - statements:
          - aggregate_on_attributes("sum", ["region"]) where metric.name == "example.queue.depth" and metric.type == METRIC_DATA_TYPE_GAUGE
```

The optional attribute list controls which data point keys survive before grouping. In this release, these forms mean different things:

| Expression | Remaining attributes |
|---|---|
| `aggregate_on_attributes("sum", ["region"])` | Only `region` |
| `aggregate_on_attributes("sum", [])` | None |
| `aggregate_on_attributes("sum")` | All existing attributes |

Omitting the list does not mean aggregate everything. It combines only points that already have equal full attribute sets. The [tagged aggregation documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md#aggregate_on_attributes) explicitly distinguishes omission from an empty list.

The function is available only in metric context. If you also need data point edits, put them in a separate group and preserve their ordering relative to aggregation.

## Avoid the Delete-Only Trap

This example is valid OTTL but does not perform an aggregation:

```yaml
processors:
  transform/remove_worker_only:
    error_mode: ignore
    metric_statements:
      - delete_key(datapoint.attributes, "worker") where metric.name == "example.queue.depth"
```

The two European points can now have identical attributes while retaining values `3` and `5`. A backend may reject, overwrite, or interpret them unexpectedly depending on the timestamps and its ingestion behavior.

When an aggregation is your intent, express it directly rather than relying on backend collision behavior. If you need the original and a derived metric, use distinct names and verify that the derived data is not accidentally aggregated twice.

A missing `region` creates its own group among points lacking that attribute. Decide whether that group is useful, should be labeled as unknown upstream, or should be investigated as incomplete instrumentation.

## Respect Time and Resource Boundaries

The function receives the points available in one metric object at processing time. It does not remember the previous request. Splitting workers across resource groups or sending them in separate payloads does not reliably produce one regional total.

Even a batching processor is not a promise of semantic alignment. A point from 10:00 and a point from 10:01 are not interchangeable samples simply because they arrive together. Check start timestamps, observation timestamps, and collection intervals before combining them.

Cumulative counters need particular care. Summing independent cumulative counters is meaningful only with compatible reset and observation behavior; the transform does not infer a globally consistent reset history. Delta data likewise needs aligned intervals. Use an appropriate stateful aggregation design when the desired operation spans time or independently arriving streams.

## Check the Metric Type and Function

The function supports sums, gauges, histograms, and exponential histograms, but only `sum` aggregation is supported for the two histogram types. Summary metrics are unsupported. Arithmetic choices such as mean or maximum have different meanings from an additive total.

For explicit histograms, verify compatible bucket layouts and check that resulting counts, boundaries, and optional sum fields remain coherent. Averaging already-calculated percentiles is not a substitute for merging a distribution.

The [aggregation implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/internal/metrics/func_aggregate_on_attributes_metrics.go) shows that attributes are filtered, data points are grouped, and a replacement metric is constructed. That explains why the operation changes data rather than adding a query-time view.

## Verify the Resulting Identities

Run a local OTLP fixture containing the three queue points, an unrelated metric, a missing-region point, and a second resource. Expect the first metric to produce the intended per-region sums without merging the second resource.

```bash
otelcol-contrib validate --config collector.yaml
otelcol-contrib --config collector.yaml
```

Inspect exported point counts, remaining attributes, timestamps, and values. Repeat with two separate requests to demonstrate the function's lack of cross-request state. This makes its operational boundary visible before a production rollout.

## Conclusion

Use explicit attribute selection and real aggregation when removing dimensions. Verify additivity, timestamps, resource identity, and reset behavior before summing. A local metric transformation can reduce point cardinality correctly, but it cannot supply missing coordination across independent metric streams.

## Official Documentation

- [Aggregation function contract](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md#aggregate_on_attributes)
- [Aggregation implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/internal/metrics/func_aggregate_on_attributes_metrics.go)
- [Metric data model](https://opentelemetry.io/docs/specs/otel/metrics/data-model/)
