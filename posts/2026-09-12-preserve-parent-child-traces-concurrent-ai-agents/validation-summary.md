# Validation Summary: Preserve Parent-Child Traces Across Concurrent Tools and AI Agents

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Python 3.11+
- `asyncio.TaskGroup`
- Python context variables (`contextvars`)
- OpenTelemetry tracing and context propagation
- LangGraph and LangChain `RunnableConfig`

## Sources Consulted

- [Python 3.11 `contextvars` documentation](https://docs.python.org/3.11/library/contextvars.html)
- [Python 3.11 coroutines, tasks, and task groups documentation](https://docs.python.org/3.11/library/asyncio-task.html)
- [OpenTelemetry Context specification](https://opentelemetry.io/docs/specs/otel/context/)
- [OpenTelemetry Tracing API specification](https://opentelemetry.io/docs/specs/otel/trace/api/)
- [OpenTelemetry messaging span semantic conventions](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/)
- [OpenTelemetry Python tracing SDK API](https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html)
- [LangGraph Graph API documentation](https://docs.langchain.com/oss/python/langgraph/graph-api)
- [LangGraph streaming documentation](https://docs.langchain.com/oss/python/langgraph/streaming)

## Issues Found

- The LangGraph node accepted `config` without identifying it as a `RunnableConfig`. Added the official `RunnableConfig` import and type annotation so LangGraph can unambiguously recognize the supported injectable node parameter and the example matches the documented node signature.

## Review Notes

- The `asyncio.TaskGroup` example correctly relies on task creation copying the current context, making the two tool spans siblings under `agent.answer`.
- `TaskGroup` was introduced in Python 3.11, so the stated Python 3.11-or-later requirement is accurate.
- OpenTelemetry Python's `start_as_current_span` correctly makes a span current for the context-manager scope, restores the previous context, ends the span on exit, and records uncaught `Exception` failures by default.
- The guidance about forwarding `RunnableConfig` explicitly for asynchronous nested calls on Python versions before 3.11 agrees with current LangGraph documentation.
- The durable-work guidance is consistent with OpenTelemetry's producer/consumer span kinds and its guidance on links for work with multiple causes or a new trace lifecycle.
