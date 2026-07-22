# Validation Summary: Showback for AI and LLM Spend: From Token Usage to Cost per Feature

## Status
validated

## Post Type
Technical Guide / FinOps Implementation Guide

## Technologies Covered
- AI and generative AI FinOps
- LLM token and modality-based metering
- Cloud showback and cost allocation
- Unit economics and outcome-based cost metrics
- Amazon Bedrock model invocation logging and per-request metadata
- Microsoft Foundry pay-as-you-go and provisioned throughput billing
- Azure Cost Management reconciliation
- FinOps Open Cost and Usage Specification (FOCUS)
- Shared platform and provisioned-capacity allocation

## Sources Consulted
- FinOps Foundation, Unit Economics: https://www.finops.org/framework/capabilities/unit-economics/
- FinOps Foundation, Usage Optimization: https://www.finops.org/framework/capabilities/usage-optimization/
- FOCUS Specification: https://focus.finops.org/focus-specification/
- FOCUS Specification v1.4: https://focus.finops.org/focus-specification/v1-4/
- Amazon Bedrock, Monitor model invocation using CloudWatch Logs and Amazon S3: https://docs.aws.amazon.com/bedrock/latest/userguide/model-invocation-logging.html
- Amazon Bedrock, Per-request metadata tagging: https://docs.aws.amazon.com/bedrock/latest/userguide/cost-mgmt-request-metadata.html
- Microsoft Foundry, Plan and Manage Costs: https://learn.microsoft.com/en-us/azure/foundry/concepts/manage-costs
- Microsoft Foundry, Provisioned throughput billing and cost management: https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/provisioned-throughput-billing

## Issues Found
No technical issues found.

## Review Notes
- The rate and unit-cost examples are conceptual formulas in `text` blocks, not executable code. Their arithmetic is correct when each rate is paired with its provider-defined pricing unit.
- The FinOps Foundation documentation supports the distinction between resource-efficiency metrics such as cost per token and outcome-oriented metrics such as cost per assist, agent action, or case deflected. It also supports the optimization techniques described in the post.
- Amazon Bedrock's current invocation-log schema includes account, region, request ID, operation, model ID, caller identity, request metadata, and input/output token counts. Per-request metadata is recorded in invocation logs rather than directly in billing exports, which is consistent with the post's recommendation to reconcile detailed telemetry with provider billing.
- Microsoft Foundry documentation confirms that token-based meters vary by model and deployment, provisioned throughput is charged on deployed PTUs rather than tokens consumed, fine-tuned models can incur training, hosting, and inference charges, and invoiced Cost Management data should be used for financial reconciliation.
- FOCUS `BilledCost` is appropriate for invoice-oriented reporting, while `EffectiveCost` reflects discounts and amortized prepaid purchases. FOCUS v1.4 also explicitly supports custom columns for provider-specific data not represented by standard columns.
- No versions are pinned in the post. The documentation links intentionally target current official pages, so pricing units, rates, and provider-specific meter names should still be maintained in an effective-dated rate catalog as the post recommends.
