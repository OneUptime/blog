# How to Merge Selected OpenTelemetry Attribute Values into One Rollup with OTTL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, Observability

Description: Use aggregate_on_attribute_value to merge selected metric categories while preserving other dimensions and validating conservation.

---

Changing several metric attribute values to the same string can create multiple data points with identical identities. The transform processor's `aggregate_on_attribute_value()` function performs the value rewrite and combines compatible points, making it a better fit for a category rollup than an isolated `set()` statement.

Use it for a specific metric with known semantics. Combining disjoint byte counters is meaningful; summing gauges that each report the same shared value is usually double-counting.

## Define the category mapping

Suppose `cache.operations` is a monotonic sum whose `cache.result` attribute contains `hit`, `stale_hit`, or `miss`. You want `hit` and `stale_hit` reported as `served_from_cache`, while retaining misses.

For one compatible collection interval:

| Method | Input result | Value |
| --- | --- | --- |
| GET | hit | 80 |
| GET | stale_hit | 5 |
| GET | miss | 15 |
| POST | hit | 10 |
| POST | stale_hit | 2 |

The desired output has GET/served_from_cache = 85, GET/miss = 15, and POST/served_from_cache = 12. The method attribute continues to separate populations.

The [transform processor reference](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md#aggregate_on_attribute_value) specifies the function and its metric context. The examples target Collector Contrib v0.160.0. Check availability in the exact Collector distribution and release you deploy; a function shown in current upstream documentation may not exist in an older image.

## Configure the transform in metric context

This diagnostic Collector receives OTLP over HTTP and prints the transformed metrics:

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 127.0.0.1:4318

processors:
  transform/cache_rollup:
    error_mode: propagate
    metric_statements:
      - context: metric
        statements:
          - aggregate_on_attribute_value("sum", "cache.result", ["hit", "stale_hit"], "served_from_cache") where metric.name == "cache.operations"

exporters:
  debug:
    verbosity: detailed

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [transform/cache_rollup]
      exporters: [debug]
```

Use loopback binding for a local fixture. Add the processor to the intended production metrics pipeline after validating it, and replace the debug exporter with the actual destination. `error_mode: propagate` makes transformation errors fail the affected processing call; choose the production policy deliberately and monitor errors rather than silently ignoring them.

The values argument is a list of strings. Confirm that the source attribute is a string and uses the expected spelling. Integer status codes need an appropriate conversion or a different transformation; writing `"200"` does not automatically match an integer value of 200.

## Understand the aggregation boundary

The function operates on data points inside one metric object. It does not maintain a distributed accumulation state across Collector replicas, resources, or separate incoming batches. An ordinary batch processor does not make it a general cross-instance rollup engine.

Other retained attributes continue to distinguish groups. If `cache.name` differs, each cache retains its own output even after the result categories are merged. Resource and instrumentation-scope boundaries remain outside this point-level transformation.

Timestamp compatibility matters too. Current [aggregation implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/internal/coreinternal/aggregateutil/aggregate.go) groups points by attributes and timestamp, and for delta sums also considers the start timestamp. Different collection intervals are not automatically resampled into one interval.

Avoid deleting timestamps or producer resource identity merely to force aggregation. The [metrics data model](https://opentelemetry.io/docs/specs/otel/metrics/data-model/#temporality) uses those fields to define which interval or cumulative lifetime a point represents.

## Account for an existing destination value

If the incoming metric already contains `cache.result="served_from_cache"`, rewriting other values to that string can combine them with the existing category. That is correct only if all three inputs represent disjoint contributions.

If the existing category already totals hit and stale-hit observations, adding the detailed categories counts the same operations twice. Reserve the destination value for this transformation or explicitly exclude an already aggregated source before processing it.

The function is also not an automatic duplicate detector. Two exporters reporting the same logical cache operation remain duplicate sources even if their attribute sets happen to become identical.

## Validate values and identities together

Send a fixture containing the five input rows above with identical valid timestamps and one resource. Confirm the three expected output groups and a total of 112 operations. Then add a second resource with the same attributes and verify it remains separate.

Repeat with different timestamps and delta start times to verify that incompatible intervals remain distinct. Include an unmatched category and an absent `cache.result` attribute. Those points should not silently vanish because the desired mapping mentions only hits.

For histogram and exponential histogram metrics, the processor supports only the `sum` aggregation operation. Compatible bucket structures and intervals still matter; the value-mapping function does not make mismatched distributions equivalent.

Finally inspect the backend's resulting series identities, not only the Collector debug output. Resource-to-label translation can alter what the backend considers distinct. The rollup is correct when each original contribution is represented once, the intended category detail is removed, and all remaining distinctions still match the operational meaning of the metric.
