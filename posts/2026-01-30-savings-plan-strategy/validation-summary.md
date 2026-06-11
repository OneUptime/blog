# Validation Summary: How to Implement Savings Plan Strategy

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- AWS Savings Plans (Compute, EC2 Instance, SageMaker)
- AWS Cost Explorer API
- AWS Cost and Usage Report (CUR)
- AWS EC2 (instance families, Graviton, Fargate)
- AWS Lambda
- boto3 (Python AWS SDK)
- AWS CLI
- Slack Block Kit (incoming webhooks)
- Mermaid diagrams (graph, quadrantChart, flowchart)

## Sources Consulted
- AWS Savings Plans pricing & types overview: https://aws.amazon.com/savingsplans/
- AWS Savings Plans User Guide: https://docs.aws.amazon.com/savingsplans/latest/userguide/
- boto3 Cost Explorer client docs (`get_cost_and_usage`, `get_savings_plans_purchase_recommendation`, `get_savings_plans_utilization`, `get_savings_plans_coverage`): https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/ce.html
- AWS CLI `ec2 describe-instance-types`: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instance-types.html
- Slack Block Kit reference: https://api.slack.com/reference/block-kit/blocks
- Mermaid quadrantChart syntax: https://mermaid.js.org/syntax/quadrantChart.html

## Issues Found

1. **Invalid `TermInYears` enum value in boto3 call** — The code passed `'THREE_YEAR'` to `get_savings_plans_purchase_recommendation`. The AWS Cost Explorer API accepts only `ONE_YEAR | THREE_YEARS` for this field. Changed `'THREE_YEAR'` to `'THREE_YEARS'` in the `terms` list so the call would actually succeed.

2. **AWS CLI `describe-instance-types` used a wildcard with the wrong parameter** — The command `aws ec2 describe-instance-types --instance-types c6i.*` will fail because `--instance-types` expects exact instance type identifiers (e.g. `c6i.large`); wildcards are only supported through filters. Rewrote the command to use `--filters Name=instance-type,Values='c6i.*'`, which is the documented way to pattern-match instance types.

3. **Mermaid `quadrantChart` quadrant labels were misaligned with the axes** — With x-axis `Low Flexibility --> High Flexibility` and y-axis `Low Savings --> High Savings`, Mermaid maps quadrant-1 to the top-right (high flex, high savings) and quadrant-2 to the top-left (low flex, high savings). The original labels placed `EC2 Instance Plans` (low flexibility) in quadrant-1 and `Compute Plans` (high savings) in quadrant-4. Relabeled to: quadrant-1 = `Compute Plans`, quadrant-2 = `EC2 Instance Plans`, quadrant-3 = `Overcommitted`, quadrant-4 = `On-Demand Only`. The data point coordinates were already consistent with this corrected mapping.

## Review Notes
- The headline discount figures (Compute SP up to 66%, EC2 Instance SP up to 72%, SageMaker SP up to 64%) match AWS's published maximums; actual discounts vary by instance type/term/payment option.
- The other boto3 API calls (`get_cost_and_usage`, `get_savings_plans_utilization`, `get_savings_plans_coverage`) and their parameter shapes match the Cost Explorer SDK reference.
- The Slack Block Kit payload uses valid `header` and `section` block schemas.
- The P10/P50 percentile math in `calculate_baseline_commitment` is illustrative — `daily_costs[len(daily_costs) // 2]` is the median index, and `int(len(daily_costs) * 0.10)` is a simple P10 approximation. Both are reasonable for the explanatory intent and not a technical error.
- AWS Savings Plans are a fast-moving area (e.g. evolving SageMaker Savings Plans coverage); readers should re-check current AWS docs for any specific discount numbers when planning real commitments.
