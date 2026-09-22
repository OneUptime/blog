# How to Separate Custom Collectors from Python Multiprocess OpenMetrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Prometheus, Monitoring, Observability

Description: Separate Gunicorn multiprocess instrumentation from a single-process custom collector and scrape both endpoints without duplicating shared metrics.

Python multiprocess mode combines instrumented metrics through per-process files. A custom collector that reads a database, queue service, or inventory API does not become part of that aggregation merely because it is registered in a worker.

The reliable design is two independently scraped endpoints: one for worker instrumentation and one for a single-process exporter that owns shared external measurements. The Python client explicitly lists custom collectors among its [multiprocess limitations](https://prometheus.github.io/client_python/multiprocess/).

## Define ownership before adding endpoints

Suppose an orders service runs four Gunicorn workers. Each worker increments `orders_completed_total`, so those contributions need multiprocess aggregation. The queue depth comes from a shared inventory snapshot, so exporting the same depth independently from every worker would create four observations of one fact.

Use this ownership model:

| Endpoint | Registry | Measurements |
|---|---|---|
| Gunicorn, port 8000 | Fresh registry with `MultiProcessCollector` | Work performed by all local workers |
| Standalone exporter, port 9101 | Ordinary custom-collector registry | One snapshot of shared queue state |

Run one snapshot exporter per independent source, or preserve a source identity when there are several. If you deliberately run redundant exporters for the same source, do not sum their queue gauges as if they represented separate queues.

## Keep the application endpoint focused

In the Gunicorn WSGI application, dispatch `/metrics` before normal application routing:

```python
from prometheus_client import CollectorRegistry, make_wsgi_app, multiprocess


def metrics(environ, start_response):
    registry = CollectorRegistry(support_collectors_without_names=True)
    multiprocess.MultiProcessCollector(registry)
    return make_wsgi_app(registry)(environ, start_response)
```

Continue using the application's existing multiprocess environment and worker cleanup hook. This snippet is the metrics route, not a second web server started by every worker. Starting a listening server during worker import causes competing binds and unclear ownership.

## Build the standalone snapshot exporter

This complete example reads an atomically replaced local JSON snapshot. It uses `prometheus-client` 0.26.0 and keeps a bounded set of queue names:

```json
{"email": 12, "webhook": 3}
```

Save this as `queue_exporter.py`:

```python
import json
import os
import threading
from pathlib import Path

if any(name in os.environ for name in ("PROMETHEUS_MULTIPROC_DIR", "prometheus_multiproc_dir")):
    raise RuntimeError("Start this exporter without multiprocess mode")

from prometheus_client import CollectorRegistry, start_http_server
from prometheus_client.core import GaugeMetricFamily

SOURCE = Path("/var/run/orders/queues.json")
ALLOWED = {"email", "webhook"}


class QueueSnapshot:
    def describe(self):
        yield GaugeMetricFamily("queue_snapshot_up", "Snapshot is readable")
        yield GaugeMetricFamily("queue_depth", "Queued items", labels=["queue"])

    def collect(self):
        depth = GaugeMetricFamily("queue_depth", "Queued items", labels=["queue"])
        try:
            data = json.loads(SOURCE.read_text(encoding="utf-8"))
            if not isinstance(data, dict) or set(data) != ALLOWED:
                raise ValueError("Unexpected queue set")
            for queue, value in data.items():
                if type(value) is not int or value < 0:
                    raise ValueError("Queue depth must be a nonnegative integer")
                depth.add_metric([queue], value)
        except (OSError, ValueError):
            yield GaugeMetricFamily("queue_snapshot_up", "Snapshot is readable", value=0)
            return
        yield GaugeMetricFamily("queue_snapshot_up", "Snapshot is readable", value=1)
        yield depth


if __name__ == "__main__":
    registry = CollectorRegistry()
    registry.register(QueueSnapshot())
    start_http_server(9101, addr="127.0.0.1", registry=registry)
    threading.Event().wait()
```

Launch it in its own process:

```bash
env -u PROMETHEUS_MULTIPROC_DIR -u prometheus_multiproc_dir python queue_exporter.py
```

Constructing a new metric family on each collection means only that snapshot's samples are returned. `describe()` advertises names without reading the file during registration. [Custom collector API](https://prometheus.github.io/client_python/collector/custom/)

The producer should write a temporary file and atomically rename it over the snapshot. For remote APIs, add a collection deadline and freshness measurement; a successful HTTP scrape alone cannot prove the upstream data is current. The strict queue-set check here treats missing queues as a source failure rather than inventing zero depth.

## Scrape and verify both targets

For Prometheus running on the same host, configure:

```yaml
scrape_configs:
  - job_name: orders-workers
    static_configs:
      - targets: ['127.0.0.1:8000']
  - job_name: orders-queues
    static_configs:
      - targets: ['127.0.0.1:9101']
```

Containers need addresses reachable from the Prometheus network namespace. Change the listener and target addresses together when deploying across hosts.

Request OpenMetrics explicitly from each endpoint:

```bash
curl --fail --silent --show-error \
  -H 'Accept: application/openmetrics-text; version=1.0.0' \
  http://127.0.0.1:9101/metrics
```

Expect queue metrics only on port 9101 and worker counters only on port 8000. The [Python HTTP exporter](https://prometheus.github.io/client_python/exporting/http/) owns negotiation and serialization. Corrupt the test snapshot and confirm `queue_snapshot_up` becomes zero while queue depths disappear. Recover the file and confirm depths return. Keep alerts for both the endpoint's Prometheus `up` metric and the collector's source-status metric, since they represent different failures.
