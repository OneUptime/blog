# Classify LLM Failures by Provider, Parser, Retriever, and Tool

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM Observability, Observability, OpenTelemetry, Python, Monitoring

Description: Build a bounded LLM failure taxonomy that separates provider errors, parsing defects, retrieval misses, guardrail decisions, and tool failures.

An `llm_error` counter is useful until every incident increments it. A provider timeout, invalid JSON, empty retrieval result, policy refusal, and failed database tool need different owners and different recovery actions.

Classify failures at the boundary where they occur. Preserve the root request outcome separately so a recovered failure is still visible without making every successful fallback look like an unavailable service.

## Separate Stage, Cause, and Outcome

Use three fields rather than one overloaded error string. The stage tells you where the failure was detected. The cause describes the bounded failure mode. The outcome describes what the application ultimately did.

| Stage | Example cause | Possible request outcome |
|---|---|---|
| Provider | Timeout, rate limit, authentication | Retry, fallback, failed |
| Parser | Invalid syntax, schema mismatch | Repair, fallback, failed |
| Retriever | Backend unavailable, empty evidence | Abstained, degraded, failed |
| Guardrail | Policy block, evaluator unavailable | Blocked, escalated, failed |
| Tool | Invalid arguments, denied access, external failure | Retry, compensated, failed |

A stage is not necessarily the ultimate root cause. Invalid JSON is detected by a parser, but a prompt change or truncation can be the reason. Keep the taxonomy factual and let traces and controlled comparisons establish causality.

LangChain documents output parsing failures as cases where a parser cannot handle model output as expected. That is distinct from the provider request failing. [Output parsing failures](https://docs.langchain.com/oss/python/langchain/errors/OUTPUT_PARSING_FAILURE).

## Classify at Adapter Boundaries

The provider adapter knows the SDK's error types and response codes. The retriever adapter knows whether zero documents is an expected search result. The tool wrapper knows whether a request was authorized and whether a write committed.

Translate those details into an application taxonomy. Do not match arbitrary exception messages with broad regular expressions if a typed error or structured status is available.

```python
from dataclasses import dataclass
from enum import Enum


class Stage(str, Enum):
    PROVIDER = "provider"
    PARSER = "parser"
    RETRIEVER = "retriever"
    GUARDRAIL = "guardrail"
    TOOL = "tool"


@dataclass(frozen=True)
class Failure:
    stage: Stage
    cause: str
    retryable: bool
    effect_status: str = "not_applicable"


def failure_attributes(failure):
    return {
        "app.failure.stage": failure.stage.value,
        "app.failure.cause": failure.cause,
        "app.failure.retryable": failure.retryable,
        "app.failure.effect_status": failure.effect_status,
    }
```

This is an application schema. Enforce a bounded cause vocabulary in each adapter before creating the record; the free string in this minimal example is not permission to insert exception text. Version the taxonomy when meanings change.

For tools, `effect_status` can distinguish not started, applied, and unknown. A network timeout after a payment or configuration write must not be treated as safely retryable merely because it was detected by a transport layer.

## Treat Guardrail Decisions as Decisions

A correctly enforced policy block is often expected behavior, not a service outage. Record the policy name and version, decision, and stage. Track whether the user received the intended explanation or escalation path.

A guardrail service being unavailable is different from the guardrail deciding to block. A timeout may trigger fail-closed or fail-open behavior according to the application's policy, but it should remain an infrastructure failure in telemetry.

LangChain supports guardrails at several middleware boundaries, including before agent execution and around model or tool calls. The point of observation determines what the decision can inspect. [LangChain guardrails](https://docs.langchain.com/oss/python/langchain/guardrails).

Avoid making the error classifier itself a language-model call on every exception. A deterministic adapter map is easier to audit and more reliable during provider outages. Use offline analysis for ambiguous cases.

## Do Not Turn Missing Evidence into an Exception Automatically

An empty retrieval result can be normal. Distinguish no matching documents, a permission filter excluding evidence, index lag, and backend failure. A well-designed RAG application may abstain successfully when evidence is insufficient.

Similarly, a model refusal is a content outcome that may be expected for a particular request class. Report it separately from network availability, while still measuring whether appropriate requests are being refused unexpectedly.

Define the service-level outcome contract with product owners: which abstentions count as successful handling, which count as degraded usefulness, and which are failures. Do not hide those distinctions in one success boolean.

## Preserve Causes Through Recovery

A parser failure followed by a successful repair should retain the failed parser span and the repair attempt. Set the root outcome to recovered success and record the recovery path. Otherwise a release can quietly double latency and spend while a simple error-rate chart stays green.

Keep a primary terminal cause on the root request when it fails, plus the ordered attempts in child spans. Do not concatenate every exception into a metric label. Use trace IDs to navigate from a bounded error category to detailed evidence.

OpenTelemetry distinguishes exception recording from span status. A recorded exception event does not necessarily set ERROR status automatically in every instrumentation path; check the API or context-manager behavior your code uses. [OpenTelemetry Python instrumentation](https://opentelemetry.io/docs/languages/python/instrumentation/).

## Test Routing and Ownership

Create synthetic cases for provider timeout, invalid output syntax, schema mismatch, empty retrieval, denied tool access, uncertain write outcome, expected policy block, and guardrail unavailability. Assert stage, cause, retryability, and root outcome.

Route alerts by these bounded categories. Provider availability can page the serving team, a sudden parser regression can point to the prompt or schema owner, and tool authorization failures may require a deployment or permission repair. Review unknown categories regularly so new errors do not disappear into a permanent miscellaneous bucket.

## Conclusion

Classify where a failure was detected, what happened, and how the request ended. Keeping expected decisions, recoveries, and uncertain side effects distinct makes alerts actionable and retries safer.

## Official Documentation

- [LangChain output parsing failure](https://docs.langchain.com/oss/python/langchain/errors/OUTPUT_PARSING_FAILURE)
- [LangChain guardrails](https://docs.langchain.com/oss/python/langchain/guardrails)
- [OpenTelemetry Python exception and status handling](https://opentelemetry.io/docs/languages/python/instrumentation/)
