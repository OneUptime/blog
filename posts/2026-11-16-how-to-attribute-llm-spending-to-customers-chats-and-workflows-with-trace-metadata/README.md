# How to Attribute LLM Spending with Customer and Workflow Trace Metadata

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, Observability, Token Usage, Cost Optimization

Description: Create a request-level cost ledger that assigns model attempts to customers, chats, and workflows without duplicating spend across traces.

A provider usage report can identify the model and project that consumed tokens while leaving the most useful product question unanswered: which customer and workflow caused the spending? Trace metadata provides that connection, but only if ownership is captured before the model call and survives retries, background jobs, and nested agents.

Treat traces as the navigable explanation of cost. Keep a durable usage ledger as the accounting input, because sampled or expired traces cannot represent every billable attempt.

## Define three independent identities

Use a customer ID for the account that owns the work, a chat ID for the conversation, and a workflow-run ID for one execution of a business process. They are related, but they are not interchangeable.

A chat can trigger several workflows. A workflow can continue after the browser disconnects. A background workflow may have no chat. Preserve those distinctions instead of inventing a synthetic conversation for every job.

At the authenticated application boundary, resolve ownership from trusted account state. Do not accept a model-generated customer ID or treat a browser-supplied identifier as authorization. The metadata describes an already-authorized operation.

An application attribution envelope might be:

```json
{
  "customer_id": "customer-184",
  "chat_id": "chat-920",
  "workflow_run_id": "run-671",
  "feature": "support-reply",
  "environment": "production",
  "allocation_policy_version": "direct-owner-v2"
}
```

These are your field names, not a universal telemetry standard. Use opaque identifiers and enforce access control on queries that expose customer-level details.

## Attach the envelope at the root

LangChain accepts metadata in runnable configuration and inherits it to child runnables. The [LangSmith tracing guide](https://docs.langchain.com/langsmith/trace-with-langchain#add-metadata-and-tags-to-traces) documents that behavior. This partial integration assumes `agent` is your configured runnable:

```python
# Application integration: agent is created by your application.
result = agent.invoke(
    {"messages": [{"role": "user", "content": "Draft a support reply."}]},
    config={
        "metadata": {
            "customer_id": "customer-184",
            "chat_id": "chat-920",
            "workflow_run_id": "run-671",
            "allocation_policy_version": "direct-owner-v2",
        },
        "tags": ["production", "support-reply"],
    },
)
```

Framework inheritance does not automatically carry metadata through an arbitrary message queue or separately deployed service. Put the approved envelope in the job payload, validate it at the consumer, and attach it to the new execution. Link traces where supported, while retaining the same workflow-run ID for accounting.

Keep customer and chat identifiers in searchable traces or ledger columns. Avoid using them as labels on global latency and token histograms: their number grows with customers and conversations. Bounded dimensions such as feature and environment work better for metric aggregation.

## Record provider attempts at the leaves

Create one usage record for each provider request attempt, with a unique local attempt ID, logical-call ID, provider request/response ID, trace/span identifiers, model, timestamps, outcome, and raw usage. Add the ownership envelope to that record when the request starts.

A retry is a new attempt under the same logical call. A fallback model is also another attempt. Both can consume resources even when the final user-visible response succeeds.

Do not record a parent agent's inclusive token total as another billable leaf. Summing the parent and its children doubles the same work. Mark records with an explicit role such as `provider_attempt` or `aggregate`; financial rollups consume only the former.

Provider totals and details may overlap. Normalize cached input, other input, output, and additional meters according to that provider's schema before pricing. Preserve unknown usage when a stream ends early rather than assigning zero cost.

## Aggregate without multiplying rows

The following query assumes an application-managed `llm_attempt_cost` table with exactly one current cost row per attempt:

```sql
SELECT customer_id, chat_id, workflow_run_id,
       COUNT(*) AS attempts,
       SUM(estimated_cost_usd) AS estimated_cost_usd,
       SUM(CASE WHEN usage_status = 'unknown' THEN 1 ELSE 0 END)
         AS attempts_missing_usage
FROM llm_attempt_cost
WHERE environment = 'production'
GROUP BY customer_id, chat_id, workflow_run_id;
```

If a chat belongs to several reporting groups, join through a unique ownership table or use an explicit allocation bridge whose weights sum to one. A many-to-many join from attempts to tags can quietly multiply spend.

Store currency with every cost. The USD column above is valid only after your pricing pipeline has produced USD values using a documented conversion policy. Never sum amounts across currencies merely because they share a column name.

## Reconcile and handle shared work

OpenAI provides separate usage and cost reporting, illustrated in its [Usage and Costs API guide](https://developers.openai.com/cookbook/examples/completions_usage_api). Use provider reporting as a reconciliation source, not as a replacement for customer ownership that the provider may never receive.

Compare ledger totals with provider costs for matching project, model/meter, and period. Keep missing telemetry and shared platform charges in visible buckets. For work shared among customers, record a separate allocation policy and weights rather than copying the whole cost to each beneficiary.

Test a normal chat, a background continuation, a retried call, a two-agent fan-out, and a missing-usage stream. Each provider attempt should reach exactly one direct owner or one explicit shared pool. The resulting report can then explain a customer's bill through workflows and individual attempts without turning tracing hierarchy into duplicated spend.
