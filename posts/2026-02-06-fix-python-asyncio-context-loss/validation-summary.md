# Validation Summary: How to Fix Context Loss in Python Asyncio Tasks When OpenTelemetry Trace

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- asyncio
- contextvars
- OpenTelemetry Python API and SDK
- OpenTelemetry tracing and span context propagation

## Sources Consulted
- Python 3.11 asyncio tasks documentation: https://docs.python.org/3.11/library/asyncio-task.html
- Python contextvars documentation: https://docs.python.org/3/library/contextvars.html
- OpenTelemetry Python context API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/context.html
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python SDK trace export API documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html

## Issues Found
- The post incorrectly stated that `asyncio.create_task()` does not propagate OpenTelemetry context by default. Python 3.7+ tasks support `contextvars`, and the Python documentation states that a task copies the current context when no explicit context is provided. I changed the problem statement and example to show context loss when tasks are created before the parent span becomes current.
- The post incorrectly described coroutine objects as capturing context at creation time. The documented behavior is that context is copied when the task is created. I changed the common pitfall from "coroutine created outside span" to "task created outside span."
- The console exporter verification snippet used `trace` and `TracerProvider` without importing them. I added the missing imports so the snippet is executable.

## Review Notes
The explicit OpenTelemetry context attachment examples use current OpenTelemetry APIs (`get_current`, `attach`, and `detach`). In Python 3.11+, `asyncio.create_task()` and `TaskGroup.create_task()` also accept a `context=` parameter for Python `contextvars.Context`, but that is distinct from OpenTelemetry's own context object, so the post's OpenTelemetry attach/detach examples remain appropriate.
