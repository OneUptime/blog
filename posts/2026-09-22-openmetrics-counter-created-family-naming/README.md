# How to Name OpenMetrics Counter Families and `_created` Timestamps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Python, Monitoring, Observability

Description: Expose counter creation times using the family base name, stable per-series start timestamps, and correct reset behavior.

---

A counter's `_created` sample reports when its cumulative sequence began. It is neither another counter total nor the scrape timestamp. Correctly naming and updating it lets a receiver distinguish a newly started counter from an older counter first discovered later.

Start with the metric family name, then let the serializer add each component suffix. For a family called `worker_jobs`, its total is `worker_jobs_total` and its creation time is `worker_jobs_created`.

## Keep metadata on the base family

```text
# TYPE worker_jobs counter
# HELP worker_jobs Jobs completed since this worker started.
worker_jobs_total{queue="default"} 19
worker_jobs_created{queue="default"} 1790031600.25
# EOF
```

This follows the [OpenMetrics counter encoding](https://prometheus.io/docs/specs/om/open_metrics_spec/#counter-1). Both samples belong to the same labeled counter. The numeric value of `_created` is Unix time in seconds, with a fractional part if available.

These variations are mistakes:

```text
# TYPE worker_jobs_total counter
worker_jobs_total 19
worker_jobs_total_created 1790031600.25
```

Declaring a family that already ends in `_total` shifts the family/component relationship. Likewise, independently declaring `worker_jobs_created` as a gauge in the same OpenMetrics response conflicts with the counter family's reserved component name. An exporter schema should reserve all generated suffixes before registering families.

For a counter measured in seconds, keep the unit on the family:

```text
# TYPE worker_processing_seconds counter
# UNIT worker_processing_seconds seconds
worker_processing_seconds_total 12.5
worker_processing_seconds_created 1790031600.25
# EOF
```

The `_created` value is still an epoch time even though the total measures accumulated processing seconds. The family's declared unit describes its measurement, not a command to convert the creation timestamp into elapsed processing time.

## Preserve creation time between scrapes

Do not assign the current time every time a scrape runs. The start timestamp belongs to the counter's lifetime. If a source counter resets, its start time must change to match that reset; if the total continues, the timestamp must remain stable.

A simple lifecycle model is:

```python
import time

class JobCounter:
    def __init__(self):
        self.reset()

    def reset(self):
        self.total = 0
        self.created = time.time()

    def complete(self):
        self.total += 1
```

This illustrates ownership, not a replacement for a thread-safe client library. A real collector should read total and creation time atomically enough to avoid combining a post-reset total with a pre-reset start time.

If an exporter reads counters from another service, the exporter's own startup time is usually not the source counter's creation time. Use the upstream start time when available. If the origin is unknown, omit the optional field rather than inventing an apparently precise history.

## Use client-provided creation metadata

The [Python client documentation](https://prometheus.github.io/client_python/instrumenting/) describes creation-time series for counters, histograms, and summaries. A single-process counter can be exported as OpenMetrics with:

```python
from prometheus_client import CollectorRegistry, Counter
from prometheus_client.openmetrics.exposition import generate_latest

registry = CollectorRegistry()
jobs = Counter("worker_jobs", "Completed jobs.", ["queue"],
               registry=registry)
jobs.labels(queue="default").inc(19)
print(generate_latest(registry).decode("utf-8"), end="")
```

Inspect the result for the base TYPE declaration and the paired `_total` and `_created` samples. Client libraries may normalize names ending in `_total`, but hand-written encoders should not depend on that API convenience.

Each label set has its own counter lifecycle. Creating a new `queue` child later can legitimately produce a later creation time than existing children. Recreating label children unnecessarily can therefore manufacture apparent resets even without a process restart.

## Distinguish observation time from start time

An explicit sample timestamp is a separate field after the sample value:

```text
# TYPE worker_jobs counter
worker_jobs_total 19 1790031660.5
worker_jobs_created 1790031600.25 1790031660.5
# EOF
```

Here the counter began at `1790031600.25` and was observed at `1790031660.5`. Both component samples describe the same observation. Ordinary exporters generally omit explicit observation timestamps and allow scrape-time stamping instead.

Finally, test two scrapes with an increasing total and unchanged creation time, then a deliberate reset with an updated creation time. Verify that the exported total still has the name existing dashboards query. Prometheus's optional [created-timestamp zero-ingestion feature](https://prometheus.io/docs/prometheus/latest/feature_flags/#start-created-timestamps-zero-injection) is a separate consumer setting; exposing `_created` correctly does not enable that behavior by itself.
