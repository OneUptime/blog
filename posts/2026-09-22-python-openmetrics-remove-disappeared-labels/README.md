# How to Remove Disappeared Label Sets from a Python OpenMetrics Exporter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Prometheus, Monitoring, Troubleshooting

Description: Remove obsolete Python metric label children, avoid detached references, and distinguish exporter cleanup from Prometheus historical retention.

Calling `gauge.labels(queue="email").set(4)` creates a child metric. If the email queue later disappears, merely stopping updates leaves that child in the registry with its old value. OpenMetrics faithfully exports the stale application state; the format cannot infer that the queue was deleted.

For a single-process exporter, remove the vanished label combination explicitly or build fresh metric families from each complete source snapshot. Multiprocess mode requires a different design because label removal is unsupported.

## Remove the child from its parent metric

This example uses `prometheus-client` 0.26.0:

```python
from prometheus_client import CollectorRegistry, Gauge
from prometheus_client.openmetrics.exposition import generate_latest

registry = CollectorRegistry()
depth = Gauge(
    "worker_queue_depth", "Items waiting for processing",
    ["region", "queue"], registry=registry,
)

depth.labels("eu", "email").set(4)
depth.labels("eu", "webhook").set(2)
depth.remove("eu", "email")

payload = generate_latest(registry).decode("utf-8")
assert 'queue="email"' not in payload
assert 'queue="webhook"' in payload
print(payload)
```

Pass positional values in the same order as the label names supplied to `Gauge`. `remove()` acts on the parent, not on the child returned by `.labels()`. `clear()` removes every child label combination; it does not unregister the metric family itself. The [Python client implementation](https://github.com/prometheus/client_python/blob/v0.26.0/prometheus_client/metrics.py) defines both operations.

Do not retain a child reference after removal and expect further updates to recreate it. That object has been detached from the parent's exported children. Call `.labels(...)` again when the entity returns. Labelled metrics are created when the application calls `.labels()`, as described in the [label documentation](https://prometheus.github.io/client_python/instrumenting/labels/).

## Reconcile a complete source snapshot

For a periodic inventory poller, keep the previous successful label set and remove only entries missing from the next successful snapshot:

```python
known = set()


def publish_snapshot(rows):
    global known
    current = {}
    for row in rows:
        key = (str(row["region"]), str(row["queue"]))
        value = row["depth"]
        if key in current or type(value) is not int or value < 0:
            raise ValueError("Invalid or duplicate queue measurement")
        current[key] = value

    # Validate the entire snapshot before changing exported state.
    for key, value in current.items():
        depth.labels(*key).set(value)
    for key in known - current.keys():
        depth.remove(*key)
    known = set(current)
```

Use one publisher for this state. The client protects its internal child map, but this reconciliation is not an atomic transaction across all series. A concurrent scrape can see part of an update. If a consistent snapshot matters, use the custom collector approach below.

Call `publish_snapshot([])` only when the source successfully reports an empty inventory. A timeout, authentication error, or malformed response is not evidence that every queue disappeared. Decide whether failure should suppress data or retain the previous snapshot with an explicit freshness and success metric; either policy needs a visible failure signal.

## Prefer fresh families for a dynamic inventory

A custom collector avoids long-lived child objects altogether:

```python
from prometheus_client.core import GaugeMetricFamily


class QueueCollector:
    def __init__(self, read_snapshot):
        self.read_snapshot = read_snapshot

    def describe(self):
        yield GaugeMetricFamily(
            "worker_queue_depth", "Items waiting for processing",
            labels=["region", "queue"],
        )

    def collect(self):
        # Return a validated, immutable copy from the refresh worker.
        snapshot = self.read_snapshot()
        metric = GaugeMetricFamily(
            "worker_queue_depth", "Items waiting for processing",
            labels=["region", "queue"],
        )
        for (region, queue), value in snapshot.items():
            metric.add_metric([region, queue], value)
        yield metric
```

Choose this instead of registering the earlier `Gauge` with the same name. Swap snapshots under the refresh worker's lock and release that lock before serializing metrics. The custom collector API emits exactly the samples yielded during each collection. [Custom collectors](https://prometheus.github.io/client_python/collector/custom/)

## Verify disappearance at the right layer

First fetch the actual endpoint with an OpenMetrics `Accept` header and confirm the removed labels are absent. Then wait for a successful Prometheus scrape and evaluate the raw series selector at the current time. A range query can still show historical samples; removing a child does not delete stored history. Prometheus's [staleness behavior](https://prometheus.io/docs/prometheus/latest/querying/basics/#staleness) determines when absent series stop appearing in instant queries.

Avoid replacing deletion with `set(0)` unless zero really means an existing empty queue. Avoid deleting counter children simply to reduce memory: recreating them starts a new cumulative value and introduces resets. Finally, if `PROMETHEUS_MULTIPROC_DIR` is enabled, `remove()` and `clear()` cannot erase the worker-file aggregate. Move dynamic inventory metrics to an ordinary single-process exporter rather than editing active multiprocess files.
