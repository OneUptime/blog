# How to Handle OpenTelemetry SDK Shutdown in Python with atexit Hooks and SIGTERM Signal Handlers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Python, Graceful Shutdown, SIGTERM

Description: Handle OpenTelemetry SDK shutdown in Python using atexit hooks and SIGTERM signal handlers to flush pending telemetry data.

Python processes can exit in several ways: normal completion, unhandled exceptions, SIGTERM from the OS, or SIGINT from Ctrl+C. Each exit path requires different handling to ensure the OpenTelemetry SDK flushes its pending spans and metrics. The Python SDK registers an `atexit` hook by default, but this does not cover all scenarios, especially SIGTERM in containerized deployments.

## Default Behavior

When you create a TracerProvider with a BatchSpanProcessor, the SDK automatically registers an `atexit` hook that calls `shutdown()`. This works for:

- Normal script completion
- `sys.exit()` calls
- Unhandled exceptions (Python calls atexit hooks before exiting)

It does NOT work for:

- SIGTERM (default signal from `docker stop` and `kubectl delete pod`)
- SIGKILL (cannot be caught)
- `os._exit()` (bypasses atexit hooks)

## The SIGTERM Problem in Containers

When Kubernetes sends SIGTERM to your pod, the default Python behavior is to raise `SystemExit`. If your code catches this exception but does not flush the SDK, you lose the final batch of telemetry:

```python
# This is what happens by default with SIGTERM
# Python converts SIGTERM to SystemExit
# atexit hooks DO run for SystemExit, but only if the main thread completes

# In a threaded web server, the main thread might not exit cleanly
# when SIGTERM arrives, so atexit hooks may not run
```

## Complete Shutdown Setup

```python
# otel_setup.py
import atexit
import signal
import sys
import logging
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.resources import Resource

logger = logging.getLogger(__name__)


class OTelManager:
    """Manages OpenTelemetry SDK lifecycle with proper shutdown handling."""

    def __init__(self):
        self._tracer_provider = None
        self._meter_provider = None
        self._shutdown_called = False

    def initialize(self, service_name, collector_endpoint="localhost:4317"):
        resource = Resource.create({
            "service.name": service_name,
        })

        # Set up tracing
        trace_exporter = OTLPSpanExporter(
            endpoint=collector_endpoint,
            insecure=True,
        )
        self._tracer_provider = TracerProvider(resource=resource)
        self._tracer_provider.add_span_processor(
            BatchSpanProcessor(
                trace_exporter,
                max_queue_size=8192,
                schedule_delay_millis=5000,
                max_export_batch_size=512,
                export_timeout_millis=30000,
            )
        )
        trace.set_tracer_provider(self._tracer_provider)

        # Set up metrics
        metric_exporter = OTLPMetricExporter(
            endpoint=collector_endpoint,
            insecure=True,
        )
        metric_reader = PeriodicExportingMetricReader(
            metric_exporter,
            export_interval_millis=30000,
        )
        self._meter_provider = MeterProvider(
            resource=resource,
            metric_readers=[metric_reader],
        )
        metrics.set_meter_provider(self._meter_provider)

        # Register shutdown handlers
        self._register_shutdown_handlers()

    def shutdown(self, timeout_millis=10000):
        """Flush and shut down the SDK. Safe to call multiple times."""
        if self._shutdown_called:
            return
        self._shutdown_called = True

        logger.info("Shutting down OpenTelemetry SDK...")

        if self._tracer_provider:
            try:
                # Force flush first to ensure all pending spans are sent
                self._tracer_provider.force_flush(timeout_millis=timeout_millis)
                logger.info("TracerProvider force flush complete")
            except Exception as e:
                logger.warning("TracerProvider force flush failed: %s", e)

            try:
                self._tracer_provider.shutdown()
                logger.info("TracerProvider shutdown complete")
            except Exception as e:
                logger.warning("TracerProvider shutdown failed: %s", e)

        if self._meter_provider:
            try:
                self._meter_provider.shutdown(timeout_millis=timeout_millis)
                logger.info("MeterProvider shutdown complete")
            except Exception as e:
                logger.warning("MeterProvider shutdown failed: %s", e)

        logger.info("OpenTelemetry SDK shutdown complete")

    def _register_shutdown_handlers(self):
        """Register handlers for all exit paths."""

        # Handler 1: atexit hook for normal exits
        atexit.register(self.shutdown)

        # Handler 2: SIGTERM handler for container stops
        original_sigterm = signal.getsignal(signal.SIGTERM)

        def sigterm_handler(signum, frame):
            logger.info("Received SIGTERM, initiating shutdown")
            self.shutdown()
            # Call the original handler if there was one
            if callable(original_sigterm):
                original_sigterm(signum, frame)
            else:
                sys.exit(0)

        signal.signal(signal.SIGTERM, sigterm_handler)

        # Handler 3: SIGINT handler for Ctrl+C
        original_sigint = signal.getsignal(signal.SIGINT)

        def sigint_handler(signum, frame):
            logger.info("Received SIGINT, initiating shutdown")
            self.shutdown()
            if callable(original_sigint):
                original_sigint(signum, frame)
            else:
                sys.exit(0)

        signal.signal(signal.SIGINT, sigint_handler)


# Module-level singleton
otel_manager = OTelManager()
```

## Using It in a Flask Application

```python
# app.py
from flask import Flask
from otel_setup import otel_manager

# Initialize OpenTelemetry before creating the Flask app
otel_manager.initialize(
    service_name="order-api",
    collector_endpoint="collector:4317",
)

app = Flask(__name__)

tracer = trace.get_tracer("order-api")

@app.route("/orders", methods=["POST"])
def create_order():
    with tracer.start_as_current_span("create_order") as span:
        span.set_attribute("order.type", "standard")
        # ... business logic ...
        return {"status": "created"}, 201

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
```

## Using It with Gunicorn

Gunicorn uses worker processes, so each worker needs its own SDK instance. Use Gunicorn's hooks:

```python
# gunicorn_config.py
from otel_setup import otel_manager

def post_fork(server, worker):
    """Called after a worker process is forked."""
    otel_manager.initialize(
        service_name="order-api",
        collector_endpoint="collector:4317",
    )

def worker_exit(server, worker):
    """Called when a worker process exits."""
    otel_manager.shutdown(timeout_millis=5000)
```

Run with:

```bash
gunicorn -c gunicorn_config.py app:app
```

## Signal Handler Caveats

There are a few important things to know about signal handling in Python:

1. **Signal handlers only run in the main thread.** If your web framework runs the main loop in a non-main thread, signal handlers will not fire. This is rare but can happen with some async frameworks.

2. **Calling `shutdown()` from a signal handler must be safe.** The shutdown method should not acquire locks that might already be held when the signal arrives. The OpenTelemetry SDK's shutdown is generally safe to call from signal handlers.

3. **The `_shutdown_called` flag prevents double-flush.** Since both `atexit` and the signal handler might call `shutdown()`, the flag ensures we only flush once.

```python
def shutdown(self, timeout_millis=10000):
    if self._shutdown_called:
        return  # Already shut down, nothing to do
    self._shutdown_called = True
    # ... flush and shutdown ...
```

## Testing Shutdown Behavior

```python
# test_shutdown.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory import InMemorySpanExporter
from otel_setup import OTelManager


def test_shutdown_flushes_spans():
    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    # Create a span
    tracer = trace.get_tracer("test")
    with tracer.start_as_current_span("test-op"):
        pass

    # Before shutdown
    assert len(exporter.get_finished_spans()) == 1

    # Shutdown should not lose any spans
    provider.shutdown()
    assert len(exporter.get_finished_spans()) == 1
```

Handling all exit paths in Python requires a combination of atexit hooks and signal handlers. The pattern shown here covers normal exits, SIGTERM from container orchestrators, and SIGINT from interactive sessions, ensuring your telemetry data makes it to the Collector regardless of how the process ends.
