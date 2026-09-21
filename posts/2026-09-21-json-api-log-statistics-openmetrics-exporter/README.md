# How to Convert a JSON API or Log-Derived Statistics into an OpenMetrics Exporter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Python, Monitoring, Observability

Description: Build a Python custom collector that preserves upstream metric meaning, exposes collection failures, and negotiates OpenMetrics correctly.

An API returning queue statistics is already doing the hard work of aggregation. An exporter should map that snapshot to stable metric families without counting the same upstream events again on every scrape.

This example uses Python and `prometheus-client` 0.26.0. The exporter reads an internal JSON API, exposes cumulative processed counts as counters and current queue depth as a gauge, and reports source collection failures separately. The same mapping applies to a log-processing service that already maintains those aggregates.

## Define the source contract

Assume the API returns:

```json
{"queues":[{"name":"email","depth":8,"processed_total":420}]}
```

`depth` is the current number waiting. `processed_total` is cumulative since the upstream process or durable counter began. If the API instead returns “processed in the last five minutes,” that value is a gauge, not a counter. Confirm reset behavior and aggregation windows with the source owner before implementing the exporter.

Use an explicit queue allowlist. Request IDs, log messages, filenames, and user identifiers should not become dynamically generated label values. The exporter should expose a bounded model of the system.

## Implement a snapshot collector

Install the tested client version:

```bash
python -m pip install 'prometheus-client==0.26.0'
```

Save this as `exporter.py`, adjusting the internal API endpoint:

```python
import http.client
import json
import math
import threading
import urllib.request

from prometheus_client import CollectorRegistry, start_http_server
from prometheus_client.core import CounterMetricFamily, GaugeMetricFamily

SOURCE_URL = "http://127.0.0.1:8080/stats"
QUEUES = {"email", "webhook"}


def number(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError("metric value must be numeric")
    if not math.isfinite(value) or value < 0:
        raise ValueError("metric value must be finite and nonnegative")
    return value


class QueueCollector:
    def describe(self):
        yield GaugeMetricFamily("queue_source_up", "Source collection succeeded")
        yield GaugeMetricFamily("queue_depth", "Items waiting", labels=["queue"])
        yield CounterMetricFamily(
            "queue_processed", "Items processed", labels=["queue"]
        )

    def collect(self):
        depth = GaugeMetricFamily("queue_depth", "Items waiting", labels=["queue"])
        processed = CounterMetricFamily(
            "queue_processed", "Items processed", labels=["queue"]
        )
        try:
            with urllib.request.urlopen(SOURCE_URL, timeout=2) as response:
                raw = response.read(1024 * 1024 + 1)
            if len(raw) > 1024 * 1024:
                raise ValueError("source response too large")
            data = json.loads(raw.decode("utf-8"))
            if not isinstance(data, dict) or not isinstance(data.get("queues"), list):
                raise ValueError("source must contain a queues array")
            seen = set()
            for row in data["queues"]:
                name = row["name"]
                if name not in QUEUES:
                    continue
                if name in seen:
                    raise ValueError("duplicate queue")
                seen.add(name)
                depth.add_metric([name], number(row["depth"]))
                processed.add_metric([name], number(row["processed_total"]))
        except (OSError, http.client.HTTPException, ValueError, KeyError, TypeError, OverflowError):
            yield GaugeMetricFamily("queue_source_up", "Source collection succeeded", value=0)
            return
        yield GaugeMetricFamily("queue_source_up", "Source collection succeeded", value=1)
        yield depth
        yield processed


if __name__ == "__main__":
    registry = CollectorRegistry()
    registry.register(QueueCollector())
    start_http_server(8000, addr="127.0.0.1", registry=registry)
    threading.Event().wait()
```

The custom collector API accepts metric families directly. `describe()` advertises their names without contacting the source during registration. The counter family adds the `_total` sample suffix during exposition. [Python custom collector documentation](https://prometheus.github.io/client_python/collector/custom/)

The code builds a complete snapshot before yielding business metrics. A malformed later row therefore cannot produce a partially successful snapshot. On failure it emits `queue_source_up 0` and omits queue measurements rather than inventing zero depth or zero processed work.

## Preserve source semantics

Do not replace the counter family with `Counter.inc(upstream_total)` on every scrape. If the upstream total stays at 420, successive scrapes must still expose 420; incrementing by 420 repeatedly fabricates activity.

For statistics computed from logs, persist a processing checkpoint and cumulative totals together if the exporter owns aggregation. Re-reading a rotated file must not recount old lines. If the aggregator loses its state on restart, expose a counter reset honestly and use `rate()` or `increase()` in queries. Design checkpointing before connecting live logs to the metric endpoint.

Missing queues need an explicit source contract too. The example omits a missing queue; it does not assume that absence means an empty queue. If every configured queue must always appear, reject an incomplete response instead.

## Verify the negotiated endpoint

Start the exporter and request OpenMetrics explicitly:

```bash
curl --fail --silent --show-error \
  -H 'Accept: application/openmetrics-text; version=1.0.0' \
  -D response.headers http://127.0.0.1:8000/metrics
```

Expect an OpenMetrics content type, a `queue_processed_total{queue="email"}` sample, and a final `# EOF` line. The client HTTP server handles exposition; do not prepend your own metadata or append a second end marker. [Python HTTP server](https://prometheus.github.io/client_python/exporting/http/), [OpenMetrics 1.0 format](https://prometheus.io/docs/specs/om/open_metrics_spec/)

Test two identical source snapshots, an increased cumulative count, a source reset, duplicate queue rows, invalid numbers, and an unavailable API. Confirm that failure changes `queue_source_up` and does not leave a successful-looking old snapshot indefinitely.

The urllib timeout limits blocking operations, not total response duration; a slow-trickling source can exceed two seconds overall. Use a total deadline or a refresh worker with an explicit freshness metric when that matters, and size the scrape timeout for the intended collection budget. At higher scrape fan-out, a refresh worker also prevents concurrent scrapes from overloading the source. [urllib request behavior](https://docs.python.org/3/library/urllib.request.html) Alert on source failure or stale data separately from Prometheus's `up`, which only establishes that the exporter endpoint itself was scraped successfully.
