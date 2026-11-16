# How to Diagnose HTTP/2 Resets While Collecting Streamed LLM Token Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, OpenAI, HTTP/2, Observability

Description: Separate HTTP/2 transport resets from stream parser failures and preserve unknown usage when a final usage chunk is lost.

A streamed LLM request can display a complete-looking answer and still fail before its final usage record arrives. If the transport reports an HTTP/2 reset at that point, there are two problems to investigate: why the stream ended and whether the request's usage was recorded accurately.

Do not infer that enabling usage caused the reset merely because the symptoms appeared together. A usage-only chunk can expose a parser bug, while a gateway timeout or upstream reset can independently prevent that chunk from arriving.

## Confirm the API and the failing layer

For OpenAI Chat Completions, `stream_options={"include_usage": True}` requests final aggregate usage. The final chunk can have an empty `choices` array. Interrupted streams may never deliver it. These behaviors are documented in the [Chat Completions streaming reference](https://developers.openai.com/api/reference/resources/chat/subresources/completions/streaming-events).

That option belongs to Chat Completions. Responses streams use typed events and expose response information through their lifecycle events; copying a Chat Completions parser into a Responses consumer is not a valid migration.

An HTTP/2 `RST_STREAM` terminates a particular protocol stream. The `INTERNAL_ERROR` code is a broad endpoint failure indication, not a diagnosis of an invalid prompt, token limit, or billing issue. Use the [HTTP/2 specification](https://www.rfc-editor.org/rfc/rfc9113.html#section-7) to interpret protocol codes, then collect evidence from the endpoint or intermediary that sent them.

## Accept usage without requiring a choice

This standalone Python function processes already-decoded Chat Completions chunk dictionaries for a single choice (`n=1`). With multiple choices, accumulate text separately by choice index. It contains no network call:

```python
def consume_chunks(chunks):
    text = []
    usage = None
    finish_reasons = []
    for chunk in chunks:
        if chunk.get("usage") is not None:
            usage = chunk["usage"]
        for choice in chunk.get("choices", []):
            delta = choice.get("delta", {})
            if delta.get("content"):
                text.append(delta["content"])
            if choice.get("finish_reason") is not None:
                finish_reasons.append(choice["finish_reason"])
    return {
        "text": "".join(text),
        "usage": usage,
        "usage_status": "reported" if usage is not None else "unknown",
        "finish_reasons": finish_reasons,
    }

sample = [
    {"choices": [{"delta": {"content": "Hello"}}]},
    {"choices": [{"delta": {}, "finish_reason": "stop"}]},
    {"choices": [], "usage": {"prompt_tokens": 8, "completion_tokens": 1}},
]
assert consume_chunks(sample)["usage"]["completion_tokens"] == 1
assert consume_chunks(sample[:-1])["usage_status"] == "unknown"
```

Do not stop reading when the first `finish_reason` appears; usage can follow. Conversely, an exhausted iterable alone does not prove a protocol-level successful completion. Your network adapter should separately record normal termination, parse failure, cancellation, and transport error.

A parser exception such as indexing `choices[0]` on an empty array is an application failure. An actual reset reported by the HTTP stack is a transport failure. Preserve the exception type and cause chain so one is not misreported as the other.

## Build a controlled transport comparison

For the same small request, compare usage enabled and disabled over HTTP/1.1 and HTTP/2, where the endpoint supports both. Repeat each cell several times at low concurrency and then at the concurrency that triggers the issue.

HTTPX requires HTTP/2 support to be enabled explicitly. Enabling it does not guarantee negotiation; inspect `response.http_version` in the diagnostic client. The [HTTPX HTTP/2 guide](https://www.python-httpx.org/http2/) documents both controls.

Record the SDK and HTTP library versions, endpoint hostname, negotiated protocol, request ID, response status, last event type, time since last event, and terminal exception. Include proxy and gateway versions where you control them. Avoid collecting authorization headers or full prompt bodies just to diagnose transport behavior.

Compare a direct authorized path with the normal gateway path if your environment supports that test. A reset seen only through the gateway points toward its timeout, buffering, protocol translation, or stream handling. A problem that occurs with multiple independent clients against the same endpoint is stronger provider-side evidence.

## Preserve the accounting gap

Store each attempt with a nullable provider usage field and a separate completeness status. An interrupted request with missing final usage did not necessarily consume zero tokens. If you estimate from visible output, retain the estimate separately and label its limitations, including invisible reasoning, tool arguments, and output lost before delivery.

A retry is another attempt and may create additional billable work. Do not overwrite the interrupted attempt with the successful retry or concatenate repeated text silently in the user interface. Choose retry behavior explicitly based on whether any output has already been delivered.

Alert on the fraction of attempts with unknown usage alongside reset rate. Then reconcile aggregate usage against provider reporting over a settled period. This prevents a transport incident from masquerading as a sudden cost reduction.

The fix is complete when the stream parser handles empty-choice usage chunks, the failing transport path has a reproducible explanation or provider case, and every attempt retains an honest usage status even when the final record is unavailable.
