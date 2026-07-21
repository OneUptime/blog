# Showback for AI and LLM Spend: From Token Usage to Cost per Feature

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AI FinOps, LLM, Cloud Showback, Token Usage, Unit Economics, Cost Allocation

Description: Build AI spend showback that reconciles provider charges and connects token, capacity, platform, and application costs to features and outcomes.

---

An AI invoice can identify a provider, model, region, and meter while still failing to answer the product question: which feature created the spend, and was the result worth it?

LLM showback closes that gap. It joins provider billing with request telemetry and product context, then reports cost by team, environment, model, feature, and meaningful outcome. Tokens are an important resource unit, but they are only the start.

The FinOps Foundation's Unit Economics capability explicitly describes cost per token as a resource-efficiency metric and cost per assist, agent action, or case deflected as outcome-oriented measures for generative AI. Its Usage Optimization capability calls out batching, caching, retrieval-augmented generation, model routing, token management, and agentic fan-out as relevant optimization levers.

## Understand the meters before allocating them

AI services can contain several cost models:

- Pay-as-you-go input and output tokens, often at different rates
- Cached input, reasoning, image, audio, or other modality-specific units
- Provisioned capacity billed by time rather than token consumption
- Fine-tuning training, hosting, and inference
- Agent tools, search, code execution, storage, and network charges
- Supporting compute, vector databases, queues, observability, and data pipelines

Do not force every charge into a token formula. Microsoft documents that Foundry pay-as-you-go models can use token-based metering, while provisioned throughput is billed on deployed capacity whether or not requests use it. Fine-tuned models can add training, hosting, and inference charges. The provider meter and invoice remain the source of truth for the payable amount.

## Capture request-level allocation context

At the application boundary, emit one cost-attribution event per model request or agent run. A useful record contains:

| Field | Why it matters |
| --- | --- |
| Request and trace ID | Joins model usage to an application flow without storing prompt text |
| Timestamp | Selects the correct rate and reporting period |
| Provider, model, and deployment | Determines meter and supports model comparisons |
| Team, product, feature, environment | Provides showback ownership |
| Input and output usage | Explains variable consumption |
| Cache or modality units | Captures provider-specific meters when available |
| Status, latency, and retries | Finds expensive failure and retry patterns |
| Agent or workflow ID | Groups fan-out across steps and submodels |
| Business event ID | Connects cost to an assist, case, document, or transaction |

Amazon Bedrock model invocation logs, for example, include account, region, request ID, operation, model ID, identity, input token count, and output token count. The caller can supply a `requestMetadata` object for keys such as team and environment. This makes it possible to aggregate consumption by business context without inferring ownership from IAM identity alone.

Do not put secrets, personal data, customer text, or raw prompts into cost labels. Store stable, governed identifiers and keep sensitive payloads under separate access and retention controls. Bedrock invocation logging can include request and response bodies, so configure destinations and permissions deliberately if you enable content logging.

## Build a time-aware rate catalog

Rates change by provider, model, region, deployment type, modality, and date. Store an effective-dated catalog rather than embedding today's price in a dashboard query.

For a simple token-priced request:

```text
estimated_request_cost =
  input_tokens / pricing_unit * input_rate
  + output_tokens / pricing_unit * output_rate
  + other_metered_units / their_pricing_unit * their_rate
```

Call this an estimate until it has been reconciled to provider billing. Account for contractual discounts and provider rounding at the appropriate aggregation level. Preserve the raw usage values even after computing cost so a later pricing correction can be reproduced.

## Reconcile bottom-up estimates to billed cost

Request telemetry is detailed but not financially authoritative. Billing exports are authoritative but may be too coarse for feature attribution. Use both.

1. Aggregate request estimates by provider meter, model, deployment, region, and billing period.
2. Compare them with the matching provider cost and usage records.
3. Classify the residual as timing, rounding, discount, missing telemetry, non-token charge, or error.
4. Allocate only after the difference is understood or placed in an explicit reconciliation pool.

Microsoft notes that token and request charts can temporarily differ from estimated cost because of ingestion timing and aggregation, and recommends Cost Management meter data and invoiced charges for reconciliation. That is a useful general rule across providers.

FOCUS can normalize cost concepts across billing sources. Use `BilledCost` for invoice-oriented views and `EffectiveCost` where discounts or prepaid commitments should be reflected in accountable consumption. Retain provider-specific columns for AI meters that do not map cleanly to common dimensions.

## Allocate shared and provisioned capacity fairly

Dedicated capacity does not have a natural per-request bill. Treat the deployment as a shared pool, then choose a driver that reflects consumption and controllability.

Possible drivers include:

- Weighted input and output tokens
- Processing time or provisioned-capacity consumption, when available
- Successful requests
- Reserved throughput assigned to a product
- Peak capacity requirement
- Fixed capacity shares agreed during planning

Token share is simple but can be misleading if two workloads use very different processing modes or drive different peak requirements. Publish the driver, eligible features, idle-capacity treatment, and policy version. Separate used capacity from unallocated idle capacity so teams can see the cost of overprovisioning.

Platform costs also need rules. A vector database might be attributed directly by collection or namespace, while a shared evaluation service could follow request volume. Central research or experimentation can remain in an explicitly funded pool rather than being spread with false precision.

## Roll requests up to features and outcomes

Define a stable feature taxonomy in a service catalog or product registry. Examples include `support-draft`, `document-summary`, `code-review`, and `search-answer`. The application should attach the feature ID when it calls the model gateway. For agents, carry the root business event through every subcall so fan-out does not appear as unrelated usage.

Then calculate a ladder of unit metrics:

```text
cost_per_request = allocated_feature_cost / model_requests
cost_per_success = allocated_feature_cost / successful_results
cost_per_business_outcome = allocated_feature_cost / validated_outcomes
```

A "successful result" needs a product-specific definition. It might be a response passing validation, an agent task completed without human takeover, or a support suggestion accepted. A business outcome could be a case deflected, document processed, qualified lead, or engineer hour saved.

Do not compare unlike features using tokens alone. A long legal-document analysis and a short classification request deliver different value. Compare each feature against its own quality, latency, and outcome targets.

## Design the showback views

The engineering view should show input and output tokens, retries, cache behavior, model mix, latency, error rate, estimated cost, and largest prompts or workflows by usage identifier. Product should see cost per successful outcome, adoption, quality, and trend. Finance should see billed-to-estimated reconciliation, forecast, commitment or capacity utilization, and unallocated residuals.

Every total should drill through this hierarchy:

```text
organization -> team -> product -> feature -> workflow -> model request
```

Apply access controls at lower levels. A team may need its own request metadata but not another product's tenant identifiers.

## Turn showback into controls

Visibility is most useful when teams can act. Set budgets and anomaly alerts by feature, detect retry storms and unexpected agent fan-out, cap output where appropriate, route simple tasks to suitable models, use caching where quality permits, and delete unused provisioned deployments.

Measure changes with guardrails. Cost per outcome should improve without unacceptable loss of answer quality, safety, latency, or reliability. Keep estimated opportunity separate from realized, reconciled cost reduction.

AI showback becomes valuable when a product owner can say more than "we used 400 million tokens." The useful statement is "the support-draft feature cost this amount, produced this many accepted drafts at this quality, and changed its unit cost for these explainable reasons."

## Official documentation

- [FinOps Foundation: Unit Economics](https://www.finops.org/framework/capabilities/unit-economics/)
- [FinOps Foundation: Usage Optimization](https://www.finops.org/framework/capabilities/usage-optimization/)
- [FOCUS Specification](https://focus.finops.org/focus-specification/)
- [Amazon Bedrock: Model invocation logging](https://docs.aws.amazon.com/bedrock/latest/userguide/model-invocation-logging.html)
- [Microsoft Foundry: Plan and manage costs](https://learn.microsoft.com/en-us/azure/foundry/concepts/manage-costs)
- [Microsoft Foundry: Provisioned throughput billing](https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/provisioned-throughput-billing)
