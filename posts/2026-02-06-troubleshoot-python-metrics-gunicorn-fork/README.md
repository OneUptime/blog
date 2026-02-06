# How to Troubleshoot OpenTelemetry Python SDK Not Exporting Metrics with Gunicorn Multi-Worker Fork

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Python, Gunicorn, Metrics

Description: Fix the issue where OpenTelemetry metrics stop exporting when Gunicorn forks multiple worker processes from the main process.

Gunicorn uses the pre-fork model: it creates a main process that initializes the application, then forks child worker processes. If OpenTelemetry is initialized in the main process before forking, the metrics exporter's background thread and network connections are not properly duplicated into child processes. The result: metrics silently stop exporting after the fork.

## Why Forking Breaks Metrics Export

When `fork()` is called, the child process gets a copy of the parent's memory. However:
- Background threads (like the periodic metric reader's export thread) are not forked
- File descriptors and socket connections become shared and can conflict
- The MeterProvider's internal state is copied but the export mechanism is dead

```python
# This initialization happens in the main process
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter

reader = PeriodicExportingMetricReader(OTLPMetricExporter())
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

# After fork(), the PeriodicExportingMetricReader's background thread is gone
# Metrics are recorded but never exported
```

## The Fix: Initialize After Fork

Use Gunicorn's `post_fork` hook to initialize OpenTelemetry in each worker:

```python
# gunicorn.conf.py
bind = "0.0.0.0:8000"
workers = 4
worker_class = "sync"

def post_fork(server, worker):
    """Initialize OpenTelemetry in each worker after fork."""
    from opentelemetry import trace, metrics
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.sdk.metrics import MeterProvider
    from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
    from opentelemetry.sdk.resources import Resource, SERVICE_NAME

    resource = Resource.create({
        SERVICE_NAME: "my-service",
        "worker.pid": worker.pid,
    })

    # Traces
    trace_provider = TracerProvider(resource=resource)
    trace_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
    trace.set_tracer_provider(trace_provider)

    # Metrics
    metric_reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(),
        export_interval_millis=60000,
    )
    meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(meter_provider)
```

## Using post_worker_init for Gunicorn

An alternative hook that fires after the worker's WSGI app is loaded:

```python
# gunicorn.conf.py
def post_worker_init(worker):
    """Called after the worker is initialized."""
    setup_telemetry(worker.pid)

def setup_telemetry(worker_pid):
    from opentelemetry import trace, metrics
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.metrics import MeterProvider
    from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
    from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter

    resource = Resource.create({
        SERVICE_NAME: "my-service",
        "process.pid": worker_pid,
    })

    metric_reader = PeriodicExportingMetricReader(OTLPMetricExporter())
    provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(provider)
```

## Using opentelemetry-instrument with Gunicorn

The `opentelemetry-instrument` CLI has the same forking issue. It initializes in the main process:

```bash
# This initializes OpenTelemetry before Gunicorn forks - metrics will break
opentelemetry-instrument gunicorn myapp:app -w 4
```

To work around this, use the `post_fork` hook approach instead of the CLI:

```bash
# Run Gunicorn with config that handles post-fork initialization
gunicorn myapp:app -c gunicorn.conf.py
```

## Graceful Shutdown

Each worker needs to flush its metrics on shutdown:

```python
# gunicorn.conf.py
def worker_exit(server, worker):
    """Flush telemetry when worker is shutting down."""
    from opentelemetry import trace, metrics

    trace_provider = trace.get_tracer_provider()
    if hasattr(trace_provider, 'shutdown'):
        trace_provider.shutdown()

    meter_provider = metrics.get_meter_provider()
    if hasattr(meter_provider, 'shutdown'):
        meter_provider.shutdown()
```

## Testing the Fix

Create a simple metric and verify it exports:

```python
# myapp.py
from opentelemetry import metrics

meter = metrics.get_meter("my-service")
request_counter = meter.create_counter(
    "http_requests_total",
    description="Total HTTP requests",
)

@app.route("/")
def index():
    request_counter.add(1, {"method": "GET", "path": "/"})
    return "OK"
```

After the fix, each worker independently exports its metrics. The Collector or backend aggregates them.

## Metric Deduplication

With multiple workers, each one reports the same metric names. Your backend should handle this by aggregating across `process.pid` labels. Add the worker PID as a resource attribute to distinguish between workers:

```python
resource = Resource.create({
    SERVICE_NAME: "my-service",
    "process.pid": os.getpid(),
})
```

The core lesson is straightforward: never initialize OpenTelemetry metric readers before `fork()`. Always initialize in the child process. Use Gunicorn's lifecycle hooks to set up telemetry at the right time.
