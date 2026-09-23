# How to Aggregate OpenTelemetry Histograms in OTTL While Preserving Service and Resource Boundaries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, Observability

Description: Aggregate compatible histogram data points with OTTL while retaining resource identity, interval alignment, and bucket integrity.

---

A histogram rollup combines distributions, so preserving the observation count is only the beginning. The contributing points must describe compatible units, intervals, bucket structures, and independent populations. Removing attributes without aggregation can instead produce duplicate identities that a backend handles unpredictably.

Use `aggregate_on_attributes("sum", ...)` to remove selected data-point dimensions inside a metric. Keep service, resource, and scope boundaries intact unless a separate design explicitly merges them.

## Separate resource identity from point attributes

An OTLP metric lives inside an instrumentation scope and resource. The resource may identify `service.name`, `service.namespace`, `service.instance.id`, and deployment environment. Individual histogram points may additionally carry request method, response code, route, or customer tier.

The [metrics data model](https://opentelemetry.io/docs/specs/otel/metrics/data-model/#opentelemetry-protocol-data-model) treats these layers as meaningful identity. An OTTL attribute list for point aggregation refers to data-point keys. Adding `service.name` to that list does not copy a resource attribute into every point, nor does omitting it delete the enclosing resource.

Suppose you want per-instance request latency by method and response code, while removing route detail. The intended rollup remains separated by each original resource and scope.

## Configure a narrowly scoped aggregation

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 127.0.0.1:4318

processors:
  transform/latency_rollup:
    error_mode: propagate
    metric_statements:
      - context: metric
        statements:
          - aggregate_on_attributes("sum", ["http.request.method", "http.response.status_code"]) where metric.name == "http.server.request.duration"

exporters:
  debug:
    verbosity: detailed

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [transform/latency_rollup]
      exporters: [debug]
```

This local diagnostic pipeline changes only the named metric. The example targets Collector Contrib v0.160.0. Verify that your Collector distribution includes the transform processor and supports the function. The [transform documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md#aggregate_on_attributes) specifies metric context and permits only `sum` for histogram and exponential histogram aggregation.

The attribute list is an allowlist: attributes not listed are removed from the points before grouping. An empty list removes every point attribute. Omitting the list has different semantics and retains existing point attributes. Review that distinction carefully before applying a broad rule.

## Require compatible intervals and shapes

For an explicit histogram, consider two route points with identical bounds `[0.1, 0.5]`, identical interval timestamps, and these noncumulative bucket counts:

```text
route=/checkout  buckets=[2, 3, 1]  count=6  sum=1.9
route=/cart      buckets=[1, 4, 0]  count=5  sum=1.5
```

After removing route, the combined histogram should contain buckets `[3, 7, 1]`, count 11, and sum 3.4. OTLP explicit buckets hold counts for individual intervals, unlike Prometheus classic cumulative `le` buckets.

The current [aggregation implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/internal/coreinternal/aggregateutil/aggregate.go) groups by point attributes, timestamp, and histogram shape. Delta histograms additionally require matching start timestamps. Exponential histogram grouping also considers scale. Require matching zero thresholds as part of the producer contract rather than assuming this processor reconciles them.

Do not assume the processor automatically reconciles all incompatible bucket layouts or resamples different intervals. Points with different shape or timestamps can remain separate after their distinguishing attributes are removed. That can leave identities unsuitable for the destination even though a configuration parses successfully.

Normalize histogram settings at the SDK and test the exact deployed Collector version. When shapes legitimately differ, retain a distinguishing dimension or separate metric identity rather than forcing them into one output contract.

## Preserve service and writer boundaries

The transformation works inside each metric object; it is not a persistent cross-request aggregation service. Two resources with the same metric name do not automatically become one service-wide histogram. Separate Collector replicas also do not share accumulation state.

Avoid deleting `service.instance.id` simply to make points appear to belong to the same producer. The [single-writer principle](https://opentelemetry.io/docs/specs/otel/metrics/data-model/#single-writer) explains why overlapping writers for one stream need explicit handling. Cumulative counters and histograms are especially vulnerable to collisions and misleading resets when writer identity disappears.

For service-wide dashboards, preserving per-instance streams and aggregating compatible histogram rates in the backend is often simpler. A genuine Collector-side service rollup needs a design for routing, interval alignment, state, failure recovery, and output ownership beyond this one OTTL function.

## Verify conservation and separation

Send a fixture with two routes in one resource, then the same two routes in a second resource. Expect one combined histogram per resource for the chosen remaining attributes, not one combined histogram across both services or instances.

Check every bucket, total count, sum, unit, temporality, timestamps, resource attributes, and scope. Test a mismatched-boundary point and a mismatched delta interval deliberately. The test should reveal how those points remain distinct instead of assuming they were safely merged.

Inspect the final backend identity too. An exporter may promote only selected resource attributes to labels. Preserving a resource in OTLP is insufficient if the destination translation subsequently loses the field that distinguishes independent writers.

Keep the raw diagnostic path available during rollout and compare observation rates before and after transformation. A successful rollup removes only the requested dimension, conserves compatible observations exactly once, and retains enough identity for the backend to distinguish every remaining stream.
