# Trace Every LLM Retry and Fallback Without Double-Counting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM Observability, Observability, OpenTelemetry, Python, LLM

Description: Separate logical requests, provider attempts, and usage observations so retries and fallbacks remain visible without inflating cost or latency.

A request tries one provider twice, then succeeds with a fallback. The user sees one answer, the provider clients made three attempts, and the telemetry backend receives several usage events. If every layer adds its own totals, one answer can become six apparent model calls.

Give logical work, attempts, and observations separate identities. Then derive request summaries from the attempt records instead of letting each instrumentation layer independently charge the request.

## Draw the Accounting Boundary

Use one root span for the user-visible request. Under it, represent routing and each actual provider attempt. A fallback is another attempt with a different provider or model; a retry is another attempt under the same logical operation.

```text
answer.request
  route.primary
    model.attempt 1: timeout, usage unknown
    model.attempt 2: provider error, usage partial
  route.fallback
    model.attempt 3: completed, usage final
```

The request outcome is successful, but the earlier failures remain visible. Do not overwrite their status merely because the fallback worked. Also distinguish application-level retries from transport retries hidden inside a provider SDK.

If a client automatically retries HTTP requests, determine whether your LLM integration exposes each network attempt or only the overall client call. Document that observability limit. A single span must not claim to enumerate every provider attempt if the SDK retries internally without exposing them.

OpenTelemetry supports child spans, attributes, and status for these separate operations. The `app.*` fields described here are an application accounting scheme. [OpenTelemetry Python instrumentation](https://opentelemetry.io/docs/languages/python/instrumentation/).

## Assign One Owner to Usage

Choose a single integration layer to emit authoritative attempt usage. It might be the provider adapter, a gateway, or a maintained model integration. Other layers can add context but should not emit duplicate charges for the same response.

Give each attempt a stable ID before dispatch and retain the provider response or request ID when available. A durable ledger should have a uniqueness rule for the attempt's identity and a version or observation sequence for updates.

The following in-memory example shows replacement of a cumulative observation, not addition of each snapshot:

```python
class UsageLedger:
    def __init__(self):
        self.attempts = {}

    def observe(self, attempt_id, sequence, status, usage):
        previous = self.attempts.get(attempt_id)
        if previous and sequence <= previous["sequence"]:
            return
        if previous and previous["status"] == "final":
            raise ValueError("final usage requires explicit reconciliation")
        self.attempts[attempt_id] = {
            "sequence": sequence,
            "status": status,
            "usage": dict(usage),
        }
```

This is single-process demonstration code. Production ingestion needs a transactional upsert, concurrency control, and an explicit correction workflow. Do not let a delayed partial event overwrite a final record. A correction from a trusted reconciliation source should have its own audited transition.

Provider streams differ in how they deliver usage. Anthropic's `message_delta` usage is cumulative, but an event can contain only `output_tokens` while input usage arrived in `message_start`. The adapter must retain previously reported categories and update each supplied cumulative value before passing a complete normalized snapshot to this ledger. Passing the last raw event directly would discard input usage; summing cumulative output values would overcount it. An omitted category is not evidence of zero consumption. [Anthropic streaming messages](https://platform.claude.com/docs/en/build-with-claude/streaming).

## Preserve Unknown and Partial Consumption

A timeout does not prove that the provider did no work. The response may have been generated while the client lost the connection. Keep the attempt with `usage_status=unknown` or `partial` rather than assigning zero cost.

For cost reporting, show known cost, estimated cost, and the fraction of attempts with incomplete usage. Reconcile with provider records where available. A successful fallback can increase both cost and latency even when the request error rate stays unchanged.

Store category-specific usage and the pricing revision used for estimates. Do not assume cached input or reasoning tokens have the same relationship to totals across providers. A fallback may change both the tokenizer and price model, so carry its own provider and model identity.

## Measure Request Latency Once

The root span measures the elapsed user-visible request. Attempt spans measure their own elapsed execution. Backoff and routing decisions also consume time; record them where they occur.

Do not sum child durations to obtain request latency. Hedged calls can overlap, and agent tools can run concurrently. Two overlapping attempts of four seconds each can produce a request duration near four seconds, not eight. Cost may include both attempts, while elapsed latency reflects their overlap.

Measure first visible content separately for streaming. A fallback that starts after partial primary output can create a different user experience from a fallback before any output. Record whether content was already delivered and which attempt supplied the final response.

Avoid treating a cancelled losing hedge as a free attempt. Cancellation semantics and billing depend on how far the remote operation progressed.

## Keep Retry Decisions Observable

Record retry reason, retry number, configured budget, and backoff duration. Use bounded categories such as rate limit, connection failure, timeout, and transient provider error. Keep raw exception text out of metric labels and redact it from traces when it can include input.

Retries should follow an explicit policy. Authentication errors and invalid request schemas generally need configuration or request repair, while a transient service error may justify another attempt. Do not make a generic catch-all loop that retries every exception from the entire agent, including non-idempotent tool writes.

Test one successful attempt, an error followed by success, a provider fallback, duplicate usage delivery, out-of-order partial events, and overlapping hedges. Assert one logical request, the correct number of attempts, and no duplicate usage. Compare root duration with the timeline rather than the sum of children.

## Conclusion

Use one request identity, a distinct identity for every provider attempt, and one owner for usage observations. Replacement semantics, explicit unknown consumption, and root-span latency keep fallback behavior visible without inflating totals.

## Official Documentation

- [OpenTelemetry Python spans and status](https://opentelemetry.io/docs/languages/python/instrumentation/)
- [Anthropic cumulative streaming usage](https://platform.claude.com/docs/en/build-with-claude/streaming)
- [LangChain model invocation and usage](https://docs.langchain.com/oss/python/langchain/models)
