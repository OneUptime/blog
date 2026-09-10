# Split OTTL Groups When Metric and Datapoint Functions Cannot Mix

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpenTelemetry Collector, OTTL, Observability, Troubleshooting

Description: Resolve OTTL context inference failures by separating metric conversions from data point edits and preserving transformation order.

Adding a valid statement can make an existing transform processor configuration fail. A typical example combines a metric conversion with a rule that changes data point attributes. Each operation is supported, but they cannot necessarily share the same inferred OTTL context.

The examples here target OpenTelemetry Collector Contrib **0.160.0**. The solution is to organize the statements into groups whose functions and paths have compatible contexts, then verify the order in which those groups operate.

## Understand What a Statement Group Requires

The transform processor must select a context capable of parsing all paths, functions, and enums used in a group. Data point context can read a parent metric's name, but it does not acquire every function registered for metric context.

This deliberately invalid example illustrates the conflict:

```yaml
processors:
  transform/broken:
    error_mode: ignore
    metric_statements:
      - convert_sum_to_gauge() where metric.name == "legacy.active"
      - set(datapoint.attributes["source"], "legacy") where metric.name == "legacy.active"
```

`convert_sum_to_gauge` works on a metric as a whole. The second line requires iteration over data points. The [official context inference example](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md#context-inference) documents this class of incompatibility.

The parser is not complaining that the `where` condition is false or that no metrics have arrived. It cannot create the evaluator in the first place. Choosing `ignore` or `silent` will not bypass the incompatibility.

## Split the Operations into Advanced Groups

Give each compatible set of operations its own `statements` list:

```yaml
processors:
  transform/legacy:
    error_mode: ignore
    metric_statements:
      - statements:
          - convert_sum_to_gauge() where metric.name == "legacy.active"
          - set(metric.description, "Current active work") where metric.name == "legacy.active"
      - statements:
          - set(datapoint.attributes["source"], "legacy") where metric.name == "legacy.active"
```

The first group uses metric context. The second uses data point context. This example assumes `legacy.active` truly represents the current amount of work and was incorrectly encoded as a sum. If it is a cumulative count of completed work, converting it to a gauge would discard useful semantics.

You can also write explicit contexts in these advanced groups:

```yaml
processors:
  transform/explicit:
    error_mode: ignore
    metric_statements:
      - context: metric
        statements:
          - set(metric.description, "Current active work") where metric.name == "legacy.active"
      - context: datapoint
        statements:
          - set(datapoint.attributes["source"], "legacy") where metric.name == "legacy.active"
```

Explicit context makes review easier when a rule deliberately runs at a particular hierarchy level. Inference remains convenient for ordinary qualified paths. Neither style turns a metric-only function into a data point function.

## Preserve the Dependency Between Groups

Statement groups run in configuration order. If an earlier group changes a metric's name, later conditions must use the resulting name. For example:

```yaml
processors:
  transform/rename:
    error_mode: ignore
    metric_statements:
      - statements:
          - set(metric.name, "worker.active") where metric.name == "legacy.active"
      - statements:
          - set(datapoint.attributes["source"], "legacy") where metric.name == "worker.active"
```

A later condition that still checks `legacy.active` will not match. This is a runtime logic problem, unlike the original context error.

Similar care is needed around aggregation. If a data point group removes a label and a metric group aggregates the remaining identities, the label removal must happen first. Aggregation is limited to the metric being processed, so moving groups does not provide a cross-resource or cross-request aggregation service.

Keep related staging data inside the same group when using cache. Do not assume ordinary context caches persist across unrelated groups. The release has an experimental shared-cache option, but these examples do not require it.

## Build a Small Regression Fixture

Use a local OTLP receiver and detailed debug exporter, attach the chosen processor in `service.pipelines.metrics.processors`, and check the configuration:

```bash
otelcol-contrib validate --config collector.yaml
otelcol-contrib --config collector.yaml
```

A useful fixture contains `legacy.active` with two points and another metric with a similar name. Verify that both selected points get the new attribute, unrelated metrics remain untouched, and the converted metric retains the expected measurements.

For the rename example, inspect the output name and attribute together. Seeing a renamed metric alone does not prove that the second group matched. For conversions, inspect the exported data type as well as numeric values; the values can look correct while their temporality or interpretation is wrong.

When reviewing a larger configuration, write down each group's input assumptions and output changes. A short note such as `renames legacy.active before labeling its points` captures a real dependency and prevents a future formatting cleanup from accidentally changing behavior.

## Conclusion

A statement group needs one context that supports all its operations. Split metric-level functions from data point edits, keep dependencies in execution order, and test the final output with multiple points. This resolves inference errors while making the transformation's behavior easier to reason about.

## Official Documentation

- [Context inference and advanced groups](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md#context-inference)
- [Metric context](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/contexts/ottlmetric/README.md)
- [Data point context](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/contexts/ottldatapoint/README.md)
