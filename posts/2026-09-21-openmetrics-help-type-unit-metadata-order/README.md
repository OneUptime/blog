# How to Emit HELP, TYPE, and UNIT Metadata in the Correct OpenMetrics Order

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Monitoring, Observability, DevOps

Description: Emit OpenMetrics family metadata before samples, use correct unit and counter-family names, and avoid duplicate or interleaved declarations.

---

OpenMetrics metadata tells an ingestor how to interpret the samples that follow. A line beginning with `#` is not necessarily an ignorable comment: `TYPE`, `UNIT`, and `HELP` belong to the metric family's structure.

There is a useful distinction between required placement and preferred ordering. Metadata must precede the family's samples. Within the metadata, the [OpenMetrics 1.0 specification](https://prometheus.io/docs/specs/om/open_metrics_spec/#metricfamily-metadata) recommends **TYPE, UNIT, HELP**. It does not require HELP to be first, and it does not make every other metadata order invalid solely because it differs from that recommendation.

## Keep each family in one block

A complete example for a cumulative processing-time counter and a queue-depth gauge is:

```text
# TYPE worker_processing_seconds counter
# UNIT worker_processing_seconds seconds
# HELP worker_processing_seconds Total time spent processing jobs.
worker_processing_seconds_total{queue="default"} 12.5
worker_processing_seconds_total{queue="priority"} 3.2
# TYPE worker_queue_depth gauge
# HELP worker_queue_depth Jobs waiting in each queue.
worker_queue_depth{queue="default"} 8
worker_queue_depth{queue="priority"} 1
# EOF
```

All three metadata lines use `worker_processing_seconds`, the **family name**. The actual counter values use `worker_processing_seconds_total`. The `seconds` unit appears at the end of the family name and before the counter's `_total` sample suffix.

Do not declare `# UNIT worker_processing_seconds_total seconds`. That names a different family, and `seconds` is no longer its final unit suffix. For a unitless count or queue depth, omit UNIT rather than inventing a unit called `none`.

A time unit also requires correct values. Declaring `seconds` does not convert milliseconds. Convert a measured 250 milliseconds to `0.25` before serialization and keep the conversion consistent with dashboards and alerts.

## Understand defaults without depending on them

An omitted TYPE makes the family `unknown` in OpenMetrics 1.0. HELP and UNIT can be absent or empty, but useful exporters should provide meaningful help and known units. A missing declaration may still parse while depriving downstream systems and humans of useful semantics.

Avoid arbitrary diagnostic comment lines. Beyond supported metadata and the final EOF marker, OpenMetrics 1.0 does not permit general lines starting with `#`. Send debugging information to application logs or expose an explicitly designed metric instead.

The [Prometheus naming guidance](https://prometheus.io/docs/practices/naming/) recommends base units and consistent metric meaning. Include enough information in HELP to distinguish, for example, jobs started from jobs completed, or cumulative processing time from wall-clock uptime.

## Reject duplicate metadata early

This family is invalid because TYPE appears twice:

```text
# TYPE worker_queue_depth gauge
# TYPE worker_queue_depth gauge
worker_queue_depth 8
# EOF
```

The declarations remain duplicates even when their values agree. Repeated HELP or UNIT declarations are also invalid. A common cause is concatenating output from two collectors that both believe they own the family.

Resolve ownership before serialization. Maintain one definition per family and combine its samples under that definition. If collectors disagree on type, unit, help text, or label dimensions, treat the disagreement as a schema problem rather than choosing whichever declaration happened to arrive first.

## Do not interleave families

Suppose collection happens concurrently for queues A and B. Writing each completed measurement directly to the response can produce this sequence:

1. Declare the processing-time family and write queue A.
2. Declare queue depth and write queue A.
3. Return to the processing-time family for queue B.

OpenMetrics families must not be interleaved. Buffer the collected data by family, validate its schema, and then serialize each family completely. Within compound metrics such as histograms, preserve the required grouping of each labeled metric and point too.

A practical internal representation is a map from family name to a fixed definition plus a list of labeled points. Collection populates values; a separate serializer owns metadata ordering and suffix generation. This separation makes concurrency less likely to corrupt the wire format.

## Test schema and wire format independently

Use fixtures for a valid unit-bearing counter, a unitless gauge, an empty family, duplicate metadata, and metadata appearing after samples. Run the positive cases through an [OpenMetrics parser](https://github.com/prometheus/client_python/blob/master/prometheus_client/openmetrics/parser.py), and assert that invalid fixtures fail where supported by that parser.

A parser is only one check. Assert the intended unit conversion and counter sample name separately, because a syntactically valid metric can still report the wrong measurement. Finally, inspect a real Prometheus scrape and query the series name used by dashboards. The metadata order should be predictable, while the numerical meaning remains the real contract users depend on.
