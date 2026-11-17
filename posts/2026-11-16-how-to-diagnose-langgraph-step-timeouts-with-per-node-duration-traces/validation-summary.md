# Validation Summary: How to Diagnose LangGraph Step Timeouts with Per-Node Duration Traces

## Status

validated

## Post Type

Technical troubleshooting guide with a complete Python example.

## Technologies Covered

- LangGraph: StateGraph, per-node timeouts, retries, and recursion limits.
- Python: asyncio cancellation, threads, and monotonic duration measurement.
- OpenTelemetry Python API and SDK: spans, attributes, exception recording, and console export.
- HTTP dependency timeouts and gateway deadlines.

## Sources Consulted

- LangGraph fault tolerance: https://docs.langchain.com/oss/python/langgraph/fault-tolerance
- LangGraph Pregel API: https://reference.langchain.com/python/langgraph/pregel/main/Pregel
- LangGraph recursion limit: https://docs.langchain.com/oss/python/langgraph/errors/GRAPH_RECURSION_LIMIT
- OpenTelemetry Python instrumentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python span exporters and processors: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- Python asyncio tasks, cancellation, and threads: https://docs.python.org/3/library/asyncio-task.html
- Python performance counter: https://docs.python.org/3/library/time.html#time.perf_counter
- Python executor cancellation: https://docs.python.org/3/library/concurrent.futures.html#concurrent.futures.Future.cancel
- HTTPX timeout categories: https://www.python-httpx.org/advanced/timeouts/
- HTTP 504 semantics, RFC 9110 section 15.6.5: https://www.rfc-editor.org/rfc/rfc9110.html#section-15.6.5
- Author profile link: https://github.com/nawazdhandala

## Issues Found

No technical issues found.

## Review Notes

- The README was left unchanged. This is a technically relevant guide, and the documented APIs are current in the consulted references.
- Official LangGraph documentation confirms the stated minimum version of 1.2 and the async-node restriction. The timeout policy and exception imports, run timeout field, and exception kind attribute agree with the documented API.
- The distinction between per-attempt limits, request deadlines, and step counts is correct. The Pregel API still exposes step_timeout; the post appropriately advises checking its scope rather than equating it with per-node timeouts.
- Idle progress means activity observed by LangGraph. Automatic progress signals include stream output and callbacks; heartbeat mode restricts refreshes to explicit heartbeats. Arbitrary work inside a dependency does not necessarily refresh an idle timer.
- Cancellation is cooperative. Blocking the event loop can delay it, and canceling an awaiting coroutine does not forcibly terminate a running worker thread. An HTTP 504 does not establish that upstream graph execution has stopped.
- The example handles the timeout for demonstration and records it on the outer span. It does not implement retries or an overall request deadline; those are separate recommendations in the surrounding text.
- The OpenTelemetry provider, processor, exporter, span context managers, attributes, and error recording match the SDK/API documentation. Overlapping child durations cannot be summed to obtain parent elapsed time.
- Python syntax validation passed for the complete extracted code block. No terminal commands or standalone configuration snippets occur in the post.
- The three technical documentation links and the author profile link resolve to the intended resources.
