# How to Fix Context Loss in Python Asyncio Tasks When OpenTelemetry Trace Context Is Not Propagated

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Python, Asyncio, Context Propagation

Description: Fix the problem where OpenTelemetry trace context is lost when creating asyncio tasks in Python async applications.

When you create a new `asyncio.Task` in Python, the OpenTelemetry trace context may not automatically propagate to the new task. This causes spans created inside the task to become orphaned root spans instead of children of the current trace. The fix depends on your Python version and how you create the tasks.

## The Problem

```python
import asyncio
from opentelemetry import trace

tracer = trace.get_tracer("my-service")

async def process_item(item):
    # This span has no parent - it starts a new trace!
    with tracer.start_as_current_span("process_item") as span:
        span.set_attribute("item.id", item["id"])
        await asyncio.sleep(0.1)  # simulate work
        return item

async def handle_request(items):
    with tracer.start_as_current_span("handle_request"):
        # Creating tasks loses the context!
        tasks = [asyncio.create_task(process_item(item)) for item in items]
        results = await asyncio.gather(*tasks)
        return results
```

The `process_item` spans are disconnected from the `handle_request` span because `asyncio.create_task()` does not propagate the OpenTelemetry context to the new task by default.

## Why Context Is Lost

OpenTelemetry uses Python's `contextvars` module to store the current span context. In Python 3.7+, `asyncio.Task` automatically copies `contextvars` when the task is created. However, this behavior depends on how the task is created and which Python version you are using.

The context copy happens at task creation time, not at coroutine creation time. If the coroutine is created outside the span context and the task is created later, the context will be wrong.

## Fix 1: Verify contextvars Propagation (Python 3.7+)

In Python 3.7+, `asyncio.create_task()` should copy context automatically. Make sure you are creating the task inside the span:

```python
async def handle_request(items):
    with tracer.start_as_current_span("handle_request"):
        # Create tasks INSIDE the span context
        tasks = [asyncio.create_task(process_item(item)) for item in items]
        results = await asyncio.gather(*tasks)
        return results
```

This should work in Python 3.7+. If it does not, check your OpenTelemetry context propagation setup.

## Fix 2: Explicit Context Propagation

If automatic propagation does not work, pass the context explicitly:

```python
from opentelemetry import context as otel_context
from opentelemetry import trace
import asyncio

tracer = trace.get_tracer("my-service")

async def process_item(item, parent_context):
    # Attach the parent context in this task
    token = otel_context.attach(parent_context)
    try:
        with tracer.start_as_current_span("process_item") as span:
            span.set_attribute("item.id", item["id"])
            await asyncio.sleep(0.1)
            return item
    finally:
        otel_context.detach(token)

async def handle_request(items):
    with tracer.start_as_current_span("handle_request"):
        # Capture the current context
        ctx = otel_context.get_current()

        # Pass context explicitly to each task
        tasks = [
            asyncio.create_task(process_item(item, ctx))
            for item in items
        ]
        results = await asyncio.gather(*tasks)
        return results
```

## Fix 3: Use a Context-Propagating Task Factory

Create a wrapper that automatically propagates context:

```python
import asyncio
from opentelemetry import context as otel_context

def create_task_with_context(coro):
    """Create an asyncio task that propagates the current OpenTelemetry context."""
    ctx = otel_context.get_current()

    async def wrapped():
        token = otel_context.attach(ctx)
        try:
            return await coro
        finally:
            otel_context.detach(token)

    return asyncio.create_task(wrapped())

# Usage
async def handle_request(items):
    with tracer.start_as_current_span("handle_request"):
        tasks = [
            create_task_with_context(process_item(item))
            for item in items
        ]
        results = await asyncio.gather(*tasks)
        return results
```

## Fix 4: Use asyncio.TaskGroup (Python 3.11+)

Python 3.11's TaskGroup propagates context correctly:

```python
async def handle_request(items):
    with tracer.start_as_current_span("handle_request"):
        results = []
        async with asyncio.TaskGroup() as tg:
            for item in items:
                task = tg.create_task(process_item(item))
                results.append(task)

        return [task.result() for task in results]
```

## Common Pitfall: Coroutine Created Outside Span

```python
# WRONG - coroutine created outside the span
async def handle_request(items):
    # Coroutines created here, before the span exists
    coros = [process_item(item) for item in items]

    with tracer.start_as_current_span("handle_request"):
        # Tasks created inside span, but coroutines capture context at creation
        tasks = [asyncio.create_task(coro) for coro in coros]
        results = await asyncio.gather(*tasks)
        return results
```

```python
# RIGHT - everything inside the span
async def handle_request(items):
    with tracer.start_as_current_span("handle_request"):
        tasks = [asyncio.create_task(process_item(item)) for item in items]
        results = await asyncio.gather(*tasks)
        return results
```

## Verifying the Fix

Use a console exporter to check that parent-child relationships are correct:

```python
from opentelemetry.sdk.trace.export import ConsoleSpanExporter, SimpleSpanProcessor

provider = TracerProvider()
provider.add_span_processor(SimpleSpanProcessor(ConsoleSpanExporter()))
trace.set_tracer_provider(provider)
```

Check the output. Each `process_item` span should have a `parent_id` that matches the `span_id` of the `handle_request` span. If `parent_id` is `None` or `0x0000000000000000`, the context was not propagated.

## Summary

Context propagation in Python asyncio depends on `contextvars` being copied when tasks are created. In most cases with Python 3.7+, `asyncio.create_task()` handles this correctly if you create the task inside the active span. When that does not work, use explicit context passing or a context-propagating wrapper function.
