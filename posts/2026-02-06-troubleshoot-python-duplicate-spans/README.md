# How to Troubleshoot Python OpenTelemetry Producing Duplicate Spans on Every Request

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Python, Debugging, Duplicate Spans

Description: Diagnose and fix the issue where every request in your Python application generates duplicate OpenTelemetry spans.

When every request produces two identical spans in your tracing backend, you have a duplicate instrumentation problem. This is typically caused by initializing OpenTelemetry twice, registering the same instrumentation multiple times, or using both auto-instrumentation and manual instrumentation simultaneously.

## Identifying Duplicate Spans

In your tracing backend, you see two nearly identical spans for each operation:

```
GET /api/users  [================] 45ms  trace_id: abc123
GET /api/users  [================] 45ms  trace_id: abc123  (same trace!)
```

Both spans have the same trace ID but different span IDs. They have the same name, attributes, and duration.

## Cause 1: Double Initialization

The most common cause is initializing OpenTelemetry twice:

```python
# app.py
from opentelemetry.instrumentation.flask import FlaskInstrumentor

# First initialization (maybe in a setup function)
FlaskInstrumentor().instrument()

# Second initialization (maybe in a different module)
FlaskInstrumentor().instrument()  # Instruments again!
```

**Fix:** Guard against double initialization:

```python
from opentelemetry.instrumentation.flask import FlaskInstrumentor

_instrumentor = FlaskInstrumentor()

def setup_instrumentation():
    if not _instrumentor.is_instrumented_by_opentelemetry:
        _instrumentor.instrument()
```

## Cause 2: Auto-Instrumentation + Manual Instrumentation

Using `opentelemetry-instrument` CLI AND manual instrumentation in your code:

```bash
# CLI applies auto-instrumentation
opentelemetry-instrument python app.py
```

```python
# app.py also applies manual instrumentation
from opentelemetry.instrumentation.flask import FlaskInstrumentor
FlaskInstrumentor().instrument()  # Double instrumentation!
```

**Fix:** Use one approach, not both. Either remove the manual instrumentation from your code or stop using the CLI:

```bash
# Option A: Use CLI only (remove manual instrumentation from code)
opentelemetry-instrument python app.py

# Option B: Use manual instrumentation only (no CLI)
python app.py
```

## Cause 3: Multiple SpanProcessors

Adding the same exporter through multiple span processors:

```python
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

provider = TracerProvider()

# Adding the same exporter type twice
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))  # Duplicate!
```

**Fix:** Add the processor only once:

```python
provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
```

## Cause 4: Flask Reloader Initializing Twice

Flask's debug mode reloader creates duplicate initialization:

```python
if __name__ == '__main__':
    setup_tracing()  # Runs in main process AND reloader child
    app.run(debug=True)
```

**Fix:** Guard with the reloader check:

```python
import os

if __name__ == '__main__':
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not app.debug:
        setup_tracing()
    app.run(debug=True)
```

## Cause 5: Gunicorn Preload + Post-Fork

When using Gunicorn's `--preload` flag with post-fork initialization:

```python
# gunicorn.conf.py
preload_app = True  # Loads app (and instrumentation) in master

def post_fork(server, worker):
    setup_tracing()  # Also initializes in each worker
```

**Fix:** Do not use `--preload` with post-fork initialization, or check if already initialized:

```python
def post_fork(server, worker):
    from opentelemetry import trace
    current = trace.get_tracer_provider()
    if isinstance(current, trace.ProxyTracerProvider):
        # Not yet initialized - safe to initialize
        setup_tracing()
```

## Debugging Duplicate Spans

Add logging to your initialization to see when it runs:

```python
import os
import traceback

def setup_tracing():
    print(f"Initializing OpenTelemetry in PID {os.getpid()}")
    traceback.print_stack()  # Shows the call chain
    # ... initialization code
```

Run your application and check if you see multiple "Initializing" messages.

## Checking for Multiple Providers

```python
from opentelemetry import trace

provider = trace.get_tracer_provider()
print(f"Provider type: {type(provider)}")
print(f"Provider ID: {id(provider)}")

# If using SDK TracerProvider, check processors
if hasattr(provider, '_active_span_processor'):
    processors = provider._active_span_processor._span_processors
    print(f"Number of span processors: {len(processors)}")
    for p in processors:
        print(f"  {type(p).__name__} -> {type(p.span_exporter).__name__}")
```

If you see more than one span processor of the same type, you have duplicate initialization.

## The Rule

Initialize OpenTelemetry exactly once per process. Use guards, check flags, and pick either auto-instrumentation (CLI) or manual instrumentation, never both. If your setup code can run more than once (due to reloaders, forking, or module reloading), add a check to prevent double initialization.
