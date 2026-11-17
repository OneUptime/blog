# How to Monitor Whether an AI Agent Skips a Required Database Lookup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, LangGraph, Monitoring, Observability

Description: Enforce and monitor required database evidence before an AI agent can return a customer-specific answer.

A prompt that says "always check the database" expresses an intention. It does not prove that a lookup ran, that it used the right customer, or that the result reached the answer generator. If a database lookup is a product requirement, implement it as an application invariant and monitor the invariant directly.

For example, a support agent answering an order-status question must obtain current order evidence for the authenticated customer before it publishes the answer. A fluent answer from conversation history should not count as success.

## Define the requirement precisely

Specify which requests require a lookup, which query or tool version satisfies it, what identity scope it must use, how fresh the result must be, and what to do when the lookup fails. Keep the policy in versioned application code.

A zero-row result can satisfy the requirement to perform a lookup while still requiring an "order not found" response. A database timeout does not satisfy it. A lookup for a different customer also does not satisfy it, even if the query completed successfully.

Record separate fields for required, attempted, succeeded, evidence attached, and answer authorized. Collapsing those into `tool_used=true` hides important failures.

## Make the lookup a required workflow node

LangGraph's [workflows and agents guide](https://docs.langchain.com/oss/python/langgraph/workflows-agents) distinguishes predetermined workflow paths from agents that choose their own tool use. A mandatory lookup fits naturally into a fixed path before answer generation:

```text
classify_request -> determine_requirement
                           |
                 required_database_lookup
                           |
                    validate_evidence
                           |
                     generate_answer
                           |
                      release_guard
```

Requests that do not require the database can take a separate explicitly permitted path. Keep that decision visible with the policy version and reason.

If you retain an agent-selected lookup tool, enforce the invariant at the release guard anyway. A forced tool choice may require a call, but the application must still validate the arguments, execute it successfully, and verify the evidence scope.

## Represent evidence as trusted state

This standalone Python example demonstrates the final guard. It uses application-owned evidence objects rather than trusting text in the model response:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Evidence:
    customer_id: str
    run_id: str
    query_version: str
    observed_at: float
    succeeded: bool
    attached_to_answer_input: bool

def can_release(customer_id, run_id, evidence, now):
    return (
        evidence is not None
        and evidence.customer_id == customer_id
        and evidence.run_id == run_id
        and evidence.query_version == "order-status-v3"
        and evidence.succeeded
        and evidence.attached_to_answer_input
        and 0 <= now - evidence.observed_at <= 60
    )

proof = Evidence("customer-17", "run-8", "order-status-v3", 100, True, True)
assert can_release("customer-17", "run-8", proof, 110)
assert not can_release("customer-18", "run-8", proof, 110)
assert not can_release("customer-17", "run-8", proof, 200)
```

The freshness window is an example policy. Choose it from the business requirement and data consistency model. In a distributed system, use a trusted timestamp policy and account for clock skew; do not compare unrelated monotonic clocks across processes.

Only the trusted database wrapper and prompt-assembly code should create this evidence. Keep it outside model-writable state or validate it through an application-controlled reference. Otherwise a model could fabricate the very flag intended to verify its behavior.

## Trace lookup completion and evidence consumption

Create a child span for the actual database operation with bounded query name, status, duration, and row count. Avoid logging raw SQL parameters or customer records as metric labels. Keep the run ID and evidence reference in the trace for investigation.

At prompt assembly, record which evidence reference was included. At release, emit `requirement_satisfied`, `requirement_missing`, `lookup_failed`, `wrong_scope`, or `stale_evidence`. These are suggested application outcomes rather than built-in framework fields.

When LangChain tools return results, [ToolMessage](https://reference.langchain.com/python/langchain-core/messages/tool/ToolMessage) associates outputs with tool call IDs. Preserve that relationship, but remember that a correctly paired tool message alone does not establish database freshness or authorization.

## Measure violations with the right denominator

Calculate violations among requests that required the lookup, not among all chats. Report a separate rate for lookup failures and for missing lookup attempts. The former points toward database availability; the latter points toward workflow routing or enforcement.

Use the release guard's authoritative outcome for the metric. A sampled trace backend may omit some successful or failed runs, so counting visible tool spans is not a reliable denominator. Alert on released answers that violated the invariant; blocked answers should remain visible as a separate product-impact metric.

Test skipped calls, successful empty results, timeouts, stale cached evidence, wrong-customer results, and a generator that receives no evidence despite a successful query. Also test retries and resumed runs so evidence from an earlier execution cannot satisfy a new requirement accidentally.

The system is working when required data access is enforced by the workflow, evidence is tied to the correct request, and monitoring can distinguish an agent skipping work from a database failing to provide it.
