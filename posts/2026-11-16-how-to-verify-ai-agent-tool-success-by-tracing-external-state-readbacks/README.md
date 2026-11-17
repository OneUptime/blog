# How to Verify AI Agent Tool Success by Tracing External State Readbacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AI Agents, Observability, OpenTelemetry, Python

Description: Verify agent tool outcomes with independent state readbacks and trace the difference between accepted, observed, failed, and unknown operations.

An agent reports that a configuration changed because its tool returned HTTP 200. Minutes later, the system still has the old value. The request may have been queued, applied to the wrong resource, overwritten, or accepted without satisfying the user's intended condition.

Instrument the write and a subsequent read as separate operations. The tool response establishes what the service acknowledged. The readback establishes what the application observed afterward.

## Define success before invoking the tool

Express the requested outcome as a predicate over external state. For example: resource `service-42` must have `enabled=false` and the expected configuration version. Avoid comparing the entire object when the API adds timestamps or unrelated fields.

Persist an operation ID before the write. Include resource identity, intended change, precondition or version, and a verification deadline. If the API provides an idempotency key, use a stable key whose lifetime matches its documented deduplication contract.

LangGraph's fault-tolerance guidance emphasizes that retries do not make external side effects exactly once and that a missing acknowledgement leaves an unknown outcome. That same distinction matters for any agent framework. [LangGraph retry boundaries and idempotency](https://docs.langchain.com/oss/python/langgraph/fault-tolerance#retry-boundaries-and-idempotency).

Use explicit states such as `accepted`, `verified`, `mismatch`, `verification_timeout`, and `verification_unavailable`. A readback timeout must not be converted to success merely because the original write succeeded.

## Trace the command and observation separately

The following Python helper is application-defined and requires an already configured OpenTelemetry SDK. `write` and `read` are injected async API adapters. The write adapter must enforce its own request timeout and return normally only for an accepted command. The read adapter returns the external state, while `matches` evaluates the intended postcondition.

```python
import asyncio
from time import monotonic
from opentelemetry import trace

tracer = trace.get_tracer("agent.verification")

async def apply_and_verify(operation_id, write, read, matches, timeout_s=5.0):
    with tracer.start_as_current_span("tool.change") as span:
        span.set_attribute("app.operation.id", operation_id)
        with tracer.start_as_current_span("external.write"):
            await write(operation_id)
        span.add_event("write.accepted")
        deadline = monotonic() + timeout_s
        attempts = 0
        last_error = None
        while monotonic() < deadline:
            attempts += 1
            remaining = deadline - monotonic()
            try:
                async with asyncio.timeout(remaining):
                    with tracer.start_as_current_span("external.readback") as check:
                        check.set_attribute("app.verify.attempt", attempts)
                        state = await read(operation_id)
                        verified = matches(state)
                        check.set_attribute("app.verify.matches", verified)
                last_error = None
                if verified:
                    span.set_attribute("app.verify.outcome", "verified")
                    return "verified"
            except (TimeoutError, ConnectionError) as exc:
                last_error = type(exc).__name__
            remaining = deadline - monotonic()
            if remaining > 0:
                await asyncio.sleep(min(0.1, remaining))
        outcome = "verification_unavailable" if last_error else "verification_timeout"
        span.set_attribute("app.verify.outcome", outcome)
        return outcome
```

This Python 3.11+ example retries only readback, not the write. Adapt the exception handling to the actual client library, and use bounded backoff with jitter when many operations poll concurrently. Authentication failures and invalid resource IDs should normally fail immediately instead of consuming the full polling window. OpenTelemetry's instrumentation API supports the spans, events, and attributes used here. [OpenTelemetry Python instrumentation](https://opentelemetry.io/docs/languages/python/instrumentation/).

## Choose the right source of truth

Reading an application's own cache may reproduce the value it just wrote without checking the service. Prefer the authoritative resource API or a documented operation-status endpoint. If reads are eventually consistent, record the consistency mode and allow a bounded observation window based on that API's contract.

Some tools create asynchronous jobs. In that case, first verify job completion and then verify the resulting resource. A job state of `completed` may mean that processing finished, not that every requested item succeeded. Capture per-item results when the operation is a batch.

State equality also does not prove causality. Another actor might have applied the same value, or overwritten the change immediately afterward. Retain version numbers, operation references, and conditional-write results where available. For consequential workflows, define whether success means a point-in-time observation or a condition maintained for a period.

## Make uncertainty visible to the agent

Return structured verification status to the agent. For example, `accepted=true, verified=false, reason=readback_timeout` supports an honest response that the change was accepted but not yet confirmed. Do not let a prose tool response collapse these fields into an unconditional “done.”

Track verified-success rate, verification coverage, time to observation, and unavailable-readback rate. Keep mutation errors separate from verification errors. Otherwise, an outage in the read endpoint can look like every write failed.

Test wrong-resource writes, delayed visibility, permission failures, concurrent overwrites, and a lost acknowledgement after a successful mutation. The trace should connect the original intent to the observed state and make the remaining uncertainty explicit. That evidence is stronger than either the agent's confidence or the tool's transport status alone.
