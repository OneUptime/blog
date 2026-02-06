# How to Troubleshoot Thread-Local Context Loss When Using ThreadPoolExecutor with OpenTelemetry in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Python, ThreadPool, Context Propagation

Description: Fix OpenTelemetry trace context loss when dispatching work to ThreadPoolExecutor threads in Python applications.

Python's `ThreadPoolExecutor` runs tasks in a pool of threads. OpenTelemetry stores trace context in `contextvars`, which are thread-local in some configurations. When a task runs in a different thread, the trace context from the submitting thread is not available, causing spans to be orphaned.

## The Problem

```python
from concurrent.futures import ThreadPoolExecutor
from opentelemetry import trace

tracer = trace.get_tracer("my-service")
executor = ThreadPoolExecutor(max_workers=4)

def cpu_intensive_work(data):
    # This span has no parent - context was lost!
    with tracer.start_as_current_span("cpu_work") as span:
        span.set_attribute("data.size", len(data))
        return process(data)

def handle_request(request):
    with tracer.start_as_current_span("handle_request"):
        # Submit work to thread pool - context is NOT propagated
        future = executor.submit(cpu_intensive_work, request.data)
        result = future.result()
        return result
```

## Why Context Is Lost

In Python 3.7+, `contextvars` are designed to work with asyncio, where each task gets a copy of the context. However, `ThreadPoolExecutor` threads do not automatically copy `contextvars` from the submitting thread. The worker thread has its own empty context.

## Fix 1: Use contextvars.copy_context()

Python's `contextvars` module provides `copy_context()` to capture and propagate context:

```python
import contextvars
from concurrent.futures import ThreadPoolExecutor
from opentelemetry import trace

tracer = trace.get_tracer("my-service")
executor = ThreadPoolExecutor(max_workers=4)

def cpu_intensive_work(data):
    with tracer.start_as_current_span("cpu_work") as span:
        span.set_attribute("data.size", len(data))
        return process(data)

def handle_request(request):
    with tracer.start_as_current_span("handle_request"):
        # Copy the current context
        ctx = contextvars.copy_context()
        # Run the function within the copied context
        future = executor.submit(ctx.run, cpu_intensive_work, request.data)
        result = future.result()
        return result
```

The `ctx.run()` method executes the function within the copied context, making the parent span available to the child span.

## Fix 2: Create a Context-Propagating Executor

Wrap `ThreadPoolExecutor` to automatically propagate context:

```python
import contextvars
from concurrent.futures import ThreadPoolExecutor

class TracedThreadPoolExecutor(ThreadPoolExecutor):
    """ThreadPoolExecutor that propagates OpenTelemetry context."""

    def submit(self, fn, *args, **kwargs):
        ctx = contextvars.copy_context()
        return super().submit(ctx.run, fn, *args, **kwargs)

# Usage - drop-in replacement
executor = TracedThreadPoolExecutor(max_workers=4)

def handle_request(request):
    with tracer.start_as_current_span("handle_request"):
        # Context is automatically propagated
        future = executor.submit(cpu_intensive_work, request.data)
        return future.result()
```

## Fix 3: Use executor.map with Context

For batch processing with `map`:

```python
import contextvars

def handle_batch(items):
    with tracer.start_as_current_span("handle_batch"):
        ctx = contextvars.copy_context()

        def traced_process(item):
            return ctx.run(process_item, item)

        results = list(executor.map(traced_process, items))
        return results
```

## Fix 4: Manual Context Injection

For more control, inject and extract context explicitly:

```python
from opentelemetry import trace, context
from opentelemetry.propagate import inject, extract

def cpu_intensive_work(data, trace_headers):
    # Restore context from headers
    ctx = extract(trace_headers)
    token = context.attach(ctx)
    try:
        with tracer.start_as_current_span("cpu_work") as span:
            span.set_attribute("data.size", len(data))
            return process(data)
    finally:
        context.detach(token)

def handle_request(request):
    with tracer.start_as_current_span("handle_request"):
        # Capture context as headers
        headers = {}
        inject(headers)

        future = executor.submit(cpu_intensive_work, request.data, headers)
        return future.result()
```

## Using with Django or Flask

In web frameworks, the thread pool often handles background work:

```python
from myapp.executor import TracedThreadPoolExecutor

# Create a global traced executor
background_executor = TracedThreadPoolExecutor(max_workers=2)

@app.route("/api/process")
def process_endpoint():
    # The TracedThreadPoolExecutor propagates the request's trace context
    future = background_executor.submit(heavy_processing, request.json)
    return {"status": "processing", "task_id": future.result(timeout=30)}
```

## Verifying the Fix

Use the console exporter to check parent-child relationships:

```python
from opentelemetry.sdk.trace.export import ConsoleSpanExporter, SimpleSpanProcessor

provider = TracerProvider()
provider.add_span_processor(SimpleSpanProcessor(ConsoleSpanExporter()))
trace.set_tracer_provider(provider)
```

Check the output:
- `cpu_work` span should have a `parent_id` matching `handle_request`'s `span_id`
- Both spans should share the same `trace_id`

If `parent_id` is empty or None, context was not propagated.

## Performance Note

`contextvars.copy_context()` is cheap. It creates a shallow copy of the current context, which is typically just a few key-value pairs. The overhead is negligible compared to the cost of the thread pool dispatch itself.

The pattern is always the same: capture context before dispatching work to another thread, and restore it in the worker thread. The `TracedThreadPoolExecutor` wrapper makes this automatic and prevents accidental context loss throughout your application.
