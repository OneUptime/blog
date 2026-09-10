# Fix OTTL Invalid Metric Paths with Metric and Datapoint Context

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpenTelemetry Collector, OTTL, Observability, Troubleshooting

Description: Fix invalid metric path expressions by choosing the right OTTL context for metric metadata, data point attributes, and conversion functions.

An OTTL configuration can refer to a real field and still fail during Collector startup. The problem is often where the statement runs. A metric contains metadata and a collection of data points; the attributes on an individual measurement belong to its data point.

This guide uses OpenTelemetry Collector Contrib **0.160.0**. In that version, transform statements can infer their context from qualified paths. Explicit context groups remain useful when diagnosing a parser error or combining metric conversion with attribute edits.

## Recognize the Incorrect Path

Suppose a producer sends this conceptual metric:

```text
name: orders.processed
unit: {order}
type: Sum
point 1: value=12, attributes={region: eu, worker: a}
point 2: value=18, attributes={region: eu, worker: b}
```

`metric.name` addresses the shared name. `datapoint.attributes["region"]` addresses the region of the current measurement. There is no `metric.attributes` field for these labels. The [metric context](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/contexts/ottlmetric/README.md) and [data point context](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/contexts/ottldatapoint/README.md) list their supported paths separately.

This intentionally invalid fragment confuses the two:

```yaml
processors:
  transform/broken:
    metric_statements:
      - context: metric
        statements:
          - set(metric.attributes["region"], "eu")
```

Changing `error_mode` cannot repair it. Error modes handle failures while evaluating valid statements against telemetry; an unsupported path prevents the processor from being constructed.

## Put Each Edit at the Correct Level

Use qualified paths and let the processor infer the required context:

```yaml
processors:
  transform/orders:
    error_mode: ignore
    metric_statements:
      - statements:
          - set(metric.description, "Completed orders") where metric.name == "orders.processed"
      - statements:
          - set(datapoint.attributes["region"], "eu") where metric.name == "orders.processed" and datapoint.attributes["region"] == nil
```

The first group works once per metric. The second works on its individual data points and can also read the parent metric name. The `where` clause preserves a region already supplied by instrumentation.

A metric context can access parent resource and instrumentation scope data. It cannot iterate a child data point merely because the condition mentions the metric's name. Moving to data point context provides access to the child and its parents, but also changes how often the statement executes.

That distinction matters for parent mutations. If you set `metric.description` from a data point attribute, several points may overwrite the same description in sequence. Use a metric-level rule for metadata shared by every point.

## Keep Conversion Functions in Their Own Group

Some functions act on an entire metric and are registered only for metric context. For example, a conversion and a data point label edit should be separated:

```yaml
processors:
  transform/legacy:
    error_mode: ignore
    metric_statements:
      - statements:
          - convert_sum_to_gauge() where metric.name == "legacy.active_connections"
      - statements:
          - set(datapoint.attributes["source"], "legacy") where metric.name == "legacy.active_connections"
```

Use that conversion only if the original value represents a current count and was incorrectly encoded as a sum. Context correctness does not establish that a metric conversion is semantically appropriate. A cumulative request counter should not become a gauge simply to satisfy a parser.

The [transform context inference documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md#context-inference) describes why a single group cannot combine every metric-only function with a data point path.

## Validate the Configuration and the Output

Add the processor fragment to a complete local Collector configuration. This wiring sends metrics to the debug exporter:

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 127.0.0.1:4318
exporters:
  debug:
    verbosity: detailed
service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [transform/orders]
      exporters: [debug]
```

The processor definition and this wiring belong in the same file. Validate it with the exact binary you deploy:

```bash
otelcol-contrib validate --config collector.yaml
otelcol-contrib --config collector.yaml
```

Send one metric containing two points: one with `region=us` and one with no region. Expect the shared description to change, the first region to remain `us`, and only the second region to become `eu`. Also send an unrelated metric and verify that it remains unchanged.

When reading the output, distinguish resource attributes from data point attributes. A backend may display both as labels, which can hide the original hierarchy and send you toward the wrong path.

If startup still fails, temporarily remove statements until the smallest failing group remains. Check the signal section, path spelling, selected context, and function availability. Do this before adjusting regexes or investigating receiver traffic: those cannot explain a parser rejecting a field.

## Conclusion

Use `metric` paths for shared metric metadata and `datapoint` paths for measurement attributes and values. Separate metric-only functions from data point rules, then verify both startup and the shape of exported measurements. A successful parse establishes that a rule can run; a representative fixture establishes that it changes the intended data.

## Official Documentation

- [Transform processor configuration](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md)
- [Metric context](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/contexts/ottlmetric/README.md)
- [Data point context](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/contexts/ottldatapoint/README.md)
