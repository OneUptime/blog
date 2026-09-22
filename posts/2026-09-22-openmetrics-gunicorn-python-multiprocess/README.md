# How to Aggregate OpenMetrics Across Gunicorn Workers with Python Multiprocess Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Prometheus, Gunicorn, Monitoring

Description: Aggregate Python metrics across Gunicorn workers, negotiate OpenMetrics, and verify counter and live-gauge behavior through worker restarts.

A Gunicorn socket distributes requests among processes. Without multiprocess aggregation, each scrape can read a different worker's counters, making totals appear to fall even though the application never restarted. Changing the response format to OpenMetrics does not combine those processes.

Use the Python client's multiprocess storage for application instrumentation, then expose a registry containing the aggregate collector. This example targets `prometheus-client` 0.26.0 and a Unix Gunicorn deployment.

## Give one Gunicorn instance its own storage directory

Set the environment variable before Python imports the client. A newly allocated directory avoids accidentally reusing data from an earlier application run:

```bash
python -m pip install 'prometheus-client==0.26.0' gunicorn
export PROMETHEUS_MULTIPROC_DIR="$(mktemp -d /tmp/orders-metrics.XXXXXX)"
gunicorn --workers 3 --bind 127.0.0.1:8000 \
  --config gunicorn_conf.py app:app
```

Keep the directory for the entire master process lifetime. Remove it only after that instance has stopped; do not clear it during worker recycling. In a container, an instance-specific ephemeral volume is another option. Separate application instances need separate directories, even if they share a host. The [multiprocess deployment documentation](https://prometheus.github.io/client_python/multiprocess/) explains the startup requirement and registry restrictions.

## Instrument work and aggregate at scrape time

Save the following as `app.py`:

```python
from prometheus_client import (
    CollectorRegistry, Counter, Gauge, make_wsgi_app, multiprocess,
)

COMPLETED = Counter("orders_completed_total", "Orders completed")
ACTIVE = Gauge(
    "orders_in_progress", "Orders currently executing",
    multiprocess_mode="livesum",
)


def app(environ, start_response):
    if environ.get("PATH_INFO") == "/metrics":
        registry = CollectorRegistry(support_collectors_without_names=True)
        multiprocess.MultiProcessCollector(registry)
        return make_wsgi_app(registry)(environ, start_response)

    if environ.get("PATH_INFO") != "/work":
        start_response("404 Not Found", [("Content-Type", "text/plain")])
        return [b"not found\n"]

    with ACTIVE.track_inprogress():
        # Replace this block with the operation being measured.
        COMPLETED.inc()
        body = b"processed\n"
        start_response("200 OK", [("Content-Type", "text/plain")])
        return [body]
```

The scrape registry is deliberately fresh. The application counter and gauge write their worker files; they are not also registered directly into that scrape registry. Otherwise the serving worker's own measurements can appear alongside the aggregated measurements.

`make_wsgi_app` handles HTTP negotiation and compression. It lets the same endpoint respond to a normal Prometheus text request and an explicit OpenMetrics request. [Python WSGI exporter](https://prometheus.github.io/client_python/exporting/http/wsgi/)

The example measures the work completed before the response iterable is returned. For a streaming response or asynchronous operation, move the instrumentation to the actual operation lifecycle; returning a WSGI iterable does not mean every byte has reached the caller.

## Clean up dead workers without deleting counters

Save `gunicorn_conf.py`:

```python
from prometheus_client import multiprocess


def child_exit(server, worker):
    multiprocess.mark_process_dead(worker.pid)
```

`livesum` fits current in-progress work because a dead worker should no longer contribute. A plain `sum` gauge includes dead processes. The default `all` mode emits worker-specific values with a `pid` label, which is often the wrong shape for a service-level gauge.

The death hook removes files for live gauge modes. It preserves counter and histogram history so that routine worker replacement does not subtract completed work from the aggregate. [Multiprocess implementation](https://github.com/prometheus/client_python/blob/v0.26.0/prometheus_client/multiprocess.py)

## Verify behavior, including a worker replacement

Send a known number of successful operations:

```bash
for i in $(seq 1 30); do
  curl --fail --silent http://127.0.0.1:8000/work >/dev/null
done
curl --fail --silent --show-error -D headers.txt \
  -H 'Accept: application/openmetrics-text; version=1.0.0' \
  http://127.0.0.1:8000/metrics
```

On a fresh instance, expect `orders_completed_total 30.0`, `orders_in_progress 0.0`, an OpenMetrics response content type, and a final `# EOF`. Repeat the scrape several times. The completed count should remain stable whichever worker accepts the connection.

In a development deployment, replace one worker through Gunicorn's process-management mechanism. Scrape again before sending additional work: the completed total should remain 30. Then send one operation and expect 31. Restarting the entire application with a fresh directory is a real counter reset; queries should use `rate(orders_completed_total[5m])` rather than subtracting samples manually.

If totals still fluctuate, inspect the worker environment and directory permissions. If totals double, check for direct metrics registered beside `MultiProcessCollector`. If inactive workers remain in an in-progress gauge, confirm the live mode and death hook. Multiprocess mode does not support custom collectors, Info, Enum, exemplars, or removing label children; place incompatible instrumentation in a separate exporter instead of assuming OpenMetrics encoding adds those capabilities.
