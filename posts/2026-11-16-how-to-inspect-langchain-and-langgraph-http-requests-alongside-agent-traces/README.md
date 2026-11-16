# How to Inspect LangChain and LangGraph HTTP Requests Alongside Agent Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LangChain, LangGraph, Tracing, Python

Description: Join model-level agent traces with HTTP request metadata while preserving streaming and keeping credentials out of logs.

An agent trace explains which model or tool was called, but it may not explain an unexpected HTTP retry, endpoint, status code, or transport delay. HTTP-level observations fill that gap. The challenge is collecting them without consuming a streamed body, exposing credentials, or losing the connection to the logical agent step.

Instrument both layers and join them with an explicit correlation identifier. Use the framework trace for application semantics and the HTTP client for wire-level metadata.

## Decide what each layer owns

Keep prompt versions, tool decisions, workflow IDs, and model results in agent traces. Keep request method, approved endpoint identity, negotiated HTTP version, response status, selected request-ID headers, and timing milestones in HTTP telemetry.

The two layers have different cardinality. One model invocation can produce several HTTP attempts because of retries. A workflow can also make HTTP calls to retrieval and tool services. Give each attempt its own record and retain a logical model-call identifier for grouping.

Avoid logging entire URLs by default: query strings and dynamic paths can contain credentials or customer IDs. Use an allowlisted host and endpoint category. Likewise, do not dump request or response headers indiscriminately.

## Add HTTPX hooks to the model client

The following async example uses `langchain-openai` and `httpx`. Set `OPENAI_API_KEY` and `OPENAI_MODEL` before running it. It makes one real model invocation when executed, which can produce multiple HTTP attempts if the SDK retries; the code is an integration example, not an offline test:

```python
import asyncio
import contextvars
import json
import os
import time
import uuid
import httpx
from langchain_openai import ChatOpenAI

correlation = contextvars.ContextVar("model_correlation", default=None)

async def on_request(request):
    request.extensions["diagnostic_started"] = time.perf_counter()
    request.extensions["diagnostic_correlation"] = correlation.get()
    request.extensions["diagnostic_attempt_id"] = str(uuid.uuid4())

async def on_response(response):
    request = response.request
    started = request.extensions.get("diagnostic_started")
    print(json.dumps({
        "model_call_id": request.extensions.get("diagnostic_correlation"),
        "attempt_id": request.extensions.get("diagnostic_attempt_id"),
        "method": request.method,
        "host": request.url.host,
        "status": response.status_code,
        "http_version": response.http_version,
        "provider_request_id": response.headers.get("x-request-id"),
        "headers_elapsed_ms": (
            None if started is None
            else (time.perf_counter() - started) * 1000
        ),
    }))

async def main():
    async with httpx.AsyncClient(event_hooks={
        "request": [on_request], "response": [on_response],
    }) as transport:
        model = ChatOpenAI(
            model=os.environ["OPENAI_MODEL"],
            http_async_client=transport,
        )
        call_id = str(uuid.uuid4())
        token = correlation.set(call_id)
        try:
            await model.ainvoke(
                "Reply with one short greeting.",
                config={"metadata": {"model_call_id": call_id}},
            )
        finally:
            correlation.reset(token)

asyncio.run(main())
```

The [LangChain custom async-client reference](https://reference.langchain.com/python/langchain-openai/chat_models/base/BaseChatOpenAI/http_async_client) documents `http_async_client`; synchronous invocations need the separate `http_client` configuration. Apply the same configured model inside a LangGraph node to observe its provider requests.

The example logs only the hostname, but production deployments should still apply their approved-host policy. Use structured logging rather than `print` and keep the selected provider request ID under your normal telemetry access controls.

## Preserve streaming semantics

[HTTPX event hooks](https://www.python-httpx.org/advanced/event-hooks/) run before the response body is necessarily read, and async clients require async hooks. Calling `response.aread()` inside the response hook can consume the whole body before the streaming consumer sees it.

The example therefore measures elapsed time to the response hook, labeled `headers_elapsed_ms`. It does not claim to measure generation completion or first visible text. Add those milestones in the model-stream consumer, where you know which events carry displayable content.

If you must capture a body, use a bounded, redacted recording path with deliberate retention and test it with streaming enabled. Do not add unrestricted body logging to the ordinary response hook just to inspect one failing request.

## Join the records with framework traces

LangChain's [tracing metadata guide](https://docs.langchain.com/langsmith/trace-with-langchain#add-metadata-and-tags-to-traces) supports metadata on runnable invocations and inheritance to children. Configure your LangSmith tracing destination according to your workspace type, then search for the same `model_call_id` in the model trace and HTTP logs.

The context variable handles concurrent asyncio tasks inside this process. It does not automatically cross a queue, arbitrary thread boundary, or remote service. Propagate an approved identifier explicitly at those boundaries and create a fresh attempt ID for each network request.

For deeper tracing, instrument HTTPX with your OpenTelemetry stack and preserve parent context around the model invocation. Check for duplicate client spans if the SDK, framework, and application already install overlapping instrumentation.

## Use discrepancies to locate the defect

If a model trace fails with no response-hook record, inspect connection errors, TLS, pool waits, and timeouts; a response hook cannot observe a response that never arrived. Capture the final exception around the model invocation with the same correlation ID. To record each failed attempt, including failures hidden by a successful SDK retry, also instrument exceptions at the HTTP transport layer.

If several HTTP responses appear under one logical call, inspect retries and intermediate status codes. If headers arrive quickly but first text is late, investigate generation or stream consumption instead of connection setup. If the wrong hostname appears, inspect endpoint configuration. The logged hostname is the request URL host, not the proxy host; inspect proxy configuration separately.

Test a normal response, a streamed response, a retryable status, and a connection failure. Verify that correlation remains correct under concurrent calls and that no credentials or prompt bodies enter logs. The result should let you move from a failed agent step to the exact transport attempts without changing how the application consumes its stream.
