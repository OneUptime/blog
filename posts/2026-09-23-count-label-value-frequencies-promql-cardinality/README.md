# How to Use PromQL count_values() Without Excessive Cardinality

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Monitoring

Description: Choose count-by or count_values for the correct frequency calculation and keep generated label values bounded.

---

The name `count_values()` is easy to misread: it counts equal **sample values**, then writes each distinct value into a label. It does not count the values of an existing label. To count instances per software version stored in a `version` label, use `count by(version)` instead.

This distinction determines both the meaning of the result and its cardinality. Turning continuously changing measurements into label values can create a large number of short-lived series, especially when the expression becomes a recording rule.

## Count an existing label

Suppose an exporter exposes one information series per running process:

```text
app_build_info{instance="a",version="2.7.1"} 1
app_build_info{instance="b",version="2.7.1"} 1
app_build_info{instance="c",version="2.8.0"} 1
```

Count instances by the existing version label:

```promql
count by (version) (app_build_info)
```

The result is two instances on `2.7.1` and one on `2.8.0`. In contrast:

```promql
count_values("value", app_build_info)
```

returns one group, `value="1"`, with a value of three. All samples had the numeric value one. The [aggregation operator reference](https://prometheus.io/docs/prometheus/latest/querying/operators/#count_values) defines this behavior.

If more than one info series can exist per instance, decide what one entity means before counting. For example, a process may expose a different row for each component or collector. Deduplicate the appropriate identity first:

```promql
count by (cluster, version) (
  group by (cluster, instance, version) (app_build_info)
)
```

This still counts an instance twice if it simultaneously exposes two versions. That can be a meaningful deployment condition or an exporter bug; do not conceal it by dropping `version` prematurely.

## Use count_values for a bounded numeric state

A numeric state gauge is an appropriate candidate when its domain is small and documented. Suppose `worker_phase` uses 0 for idle, 1 for busy, and 2 for draining:

```promql
count_values by (cluster) ("phase_code", worker_phase)
```

This produces up to three state counts per cluster. The generated `phase_code` label encodes the sample value, while the metric value records how many workers have that state.

Use a label name that does not collide with existing dimensions. Verify the actual emitted domain before installing a rule: unknown values such as `-1`, nonfinite values, or a changed enum can introduce unexpected groups.

A useful paired check is:

```promql
count by (cluster) (worker_phase)
```

The sum of all state-frequency outputs for a cluster should equal its selected worker-series count at the same timestamp. That verifies accounting across the returned population, although it cannot prove every expected worker is present.

## Estimate output cardinality first

For `count_values by(cluster)`, the maximum output at one instant is the number of distinct `(cluster, sample value)` combinations. With 20 clusters and three allowed phase codes, the intended ceiling is 60 series.

Now consider this expression:

```promql
count_values("bytes", process_resident_memory_bytes)
```

Almost every process may have a distinct memory value. As those measurements change, a recording rule repeatedly creates new `bytes` label values. A bounded instantaneous result does not prevent large historical churn.

Native histogram samples are also supported, but their label representation includes a compact serialization of the histogram value. Counting changing distributions this way is generally unsuitable for a durable frequency metric. Use a histogram-aware calculation that matches the operational question instead.

The [Prometheus instrumentation guidance](https://prometheus.io/docs/practices/instrumentation/#do-not-overuse-labels) explains why potentially unbounded dimensions should be controlled at their source.

## Prefer purposeful categories

For memory, define a small set of categories with comparisons or expose a suitable histogram. For example, to count processes above 512 MiB:

```promql
count by (cluster) (
  process_resident_memory_bytes > 536870912
)
```

This query counts matching series. Using a comparison without `bool` filters the input; using `bool` would keep false cases with value zero, which `count` would still count.

If every cluster needs a zero when no process exceeds the threshold, build that zero from a trusted, matching population and keep scrape health separate. An absent group is not automatically proof that all processes are below the limit.

## Validate the recording rule over time

Start with an instant query and inspect the generated labels. Then test a period containing deployments and state changes. Verify that the allowed state domain stays bounded and that the historical number of label combinations remains close to the planned ceiling.

Record only the dimensions needed for the operational decision. A frequency by `cluster` and `phase_code` may be useful; retaining `instance` makes nearly every group a count of one.

Finally name the rule for the entity being counted, such as workers by phase, rather than vaguely calling it a frequency. A clear population, a bounded value domain, and a deliberate distinction between existing labels and numeric samples prevent both misleading counts and unnecessary series growth.
