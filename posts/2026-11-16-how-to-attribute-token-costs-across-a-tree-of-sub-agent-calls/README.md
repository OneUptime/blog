# How to Attribute Token Costs Across a Tree of Sub-Agent Calls

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AI Agents, LLM Observability, OpenTelemetry, Python

Description: Attribute model usage to the correct agent invocation and calculate direct and subtree costs without counting child usage twice.

A coordinator delegates to a research agent, which calls a summarizer. The trace shows three agents, but the billing export shows six model requests. Adding every span's token total produces an inflated bill because some framework spans already include their descendants.

Treat model requests as the accounting records and agent calls as ownership relationships. Keep direct usage and descendant usage separate, then derive each view from the same request ledger.

## Define the accounting boundary

Assign each agent invocation a unique `agent_call_id` and the ID of its immediate parent. Do not use the agent's name as its identity: three invocations of `researcher` are three different calls. Store a root workflow ID separately so resumed work can be grouped even when it starts another trace.

OpenTelemetry spans provide trace and parent relationships, while attributes carry application identifiers. Use those relationships for investigation, and persist a durable accounting ledger if costs must remain complete when traces are sampled or dropped. [OpenTelemetry Python instrumentation](https://opentelemetry.io/docs/languages/python/instrumentation/).

One ledger row should represent one billable provider attempt, with fields such as:

| Field | Purpose |
|---|---|
| Provider, account, request ID | Identify the usage record without cross-account collisions |
| Agent call and workflow IDs | Attribute the request to its owner |
| Model, service tier, usage time | Resolve the applicable rate |
| Input, cached input, output units | Preserve the provider's usage categories |
| Usage status and rate version | Distinguish known, estimated, and missing costs |

The ledger schema is application-defined. Token categories depend on the provider. In particular, determine whether cached input is included in total input before subtracting it, and whether an output subcategory is already included in output tokens. Do not add overlapping counters.

## Calculate direct cost before subtree cost

Direct cost belongs to the agent that issued the request. Inclusive cost belongs to that agent plus its descendants. A coordinator that issues one request and delegates two requests has one direct charge and three inclusive charges.

The following standalone Python example uses **fictional charges already calculated in USD**, so it makes no assumption about current model pricing. It rejects missing parents, cycles, and duplicate ownership records instead of silently producing a plausible total.

```python
from decimal import Decimal

parents = {"root": None, "research": "root", "summarize": "research"}
requests = [
    ("provider-a/account-1/request-1", "root", "0.010"),
    ("provider-a/account-1/request-2", "research", "0.020"),
    ("provider-a/account-1/request-3", "summarize", "0.005"),
]

def aggregate_costs(parents, requests):
    direct = {call: Decimal("0") for call in parents}
    seen = set()
    for request_id, owner, usd in requests:
        if request_id in seen:
            raise ValueError("duplicate provider attempt")
        if owner not in parents:
            raise ValueError("unknown agent owner")
        seen.add(request_id)
        direct[owner] += Decimal(usd)

    inclusive = dict(direct)
    for owner, cost in direct.items():
        visited = {owner}
        ancestor = parents[owner]
        while ancestor is not None:
            if ancestor not in parents or ancestor in visited:
                raise ValueError("missing parent or cyclic ancestry")
            visited.add(ancestor)
            inclusive[ancestor] += cost
            ancestor = parents[ancestor]
    return direct, inclusive

direct, inclusive = aggregate_costs(parents, requests)
assert direct["root"] == Decimal("0.010")
assert inclusive["root"] == Decimal("0.035")
assert inclusive["research"] == Decimal("0.025")
```

Use decimal arithmetic for currency and round at the reporting boundary according to the billing contract. Preserve raw units and rates so a disputed result can be recalculated. A price-table revision should not overwrite the rate that was applied to a historical request.

## Handle retries, replay, and shared work

A telemetry retry is another delivery of the same accounting event. Deduplicate it. A provider retry can be another billable request and must remain a separate attempt. Failed HTTP responses do not establish whether the provider consumed billable work; retain an unresolved state until the provider's usage records settle the question.

A replayed workflow also needs a new execution identity. Reusing an old workflow label for comparison is reasonable, but reusing its accounting keys can erase real charges.

For a shared sub-agent result consumed by several parents, the execution is a graph rather than a tree. Choose an explicit allocation rule: charge the producing workflow, split the cost, or record shared infrastructure cost separately. A span link expresses a relationship; it does not define a financial allocation rule. Never count the same provider attempt in every consumer's bill and then sum those bills as total spend.

## Build useful cost views

Show direct cost, inclusive cost, request count, and unknown-usage count together. A cheap root span with an expensive subtree points to delegation, whereas expensive direct cost suggests the coordinator's own prompts or repeated planning.

Group metrics by bounded dimensions such as agent role, model, and deployment version. Keep request IDs and customer IDs in the ledger or traces rather than metric labels. Check that root inclusive totals equal the sum of unique provider attempts for complete trees, and surface orphaned calls as an attribution problem.

Before rollout, test a nested tree, two parallel siblings, a duplicate telemetry delivery, a billable retry, and missing usage. These fixtures prove that a larger hierarchy changes ownership views without manufacturing additional spend.
