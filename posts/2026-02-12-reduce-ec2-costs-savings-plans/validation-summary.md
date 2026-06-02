# Validation Summary: How to Reduce EC2 Costs with Savings Plans

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Savings Plans
- Amazon EC2
- AWS Cost Explorer API
- Boto3 for Python
- AWS CLI
- Reserved Instances

## Sources Consulted
- AWS Savings Plans User Guide: Savings Plans types - https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html
- AWS Savings Plans pricing: Compute and EC2 Instance Savings Plans - https://aws.amazon.com/savingsplans/compute-pricing/
- AWS Cost Management User Guide: Cost Explorer hourly granularity - https://docs.aws.amazon.com/cost-management/latest/userguide/ce-services-hourly.html
- AWS Cost Management API Reference: GetCostAndUsage - https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetCostAndUsage.html
- Boto3 Cost Explorer get_cost_and_usage reference - https://docs.aws.amazon.com/boto3/latest/reference/services/ce/client/get_cost_and_usage.html
- Boto3 Cost Explorer get_savings_plans_purchase_recommendation reference - https://docs.aws.amazon.com/boto3/latest/reference/services/ce/client/get_savings_plans_purchase_recommendation.html
- Boto3 Cost Explorer get_savings_plans_utilization reference - https://docs.aws.amazon.com/boto3/latest/reference/services/ce/client/get_savings_plans_utilization.html
- Boto3 Cost Explorer get_savings_plans_coverage reference - https://docs.aws.amazon.com/boto3/latest/reference/services/ce/client/get_savings_plans_coverage.html
- AWS CLI create-savings-plan reference - https://docs.aws.amazon.com/cli/latest/reference/savingsplans/create-savings-plan.html
- AWS CLI describe-savings-plans-offering-rates reference - https://docs.aws.amazon.com/cli/latest/reference/savingsplans/describe-savings-plans-offering-rates.html
- AWS CLI describe-savings-plans-offerings reference - https://docs.aws.amazon.com/cli/latest/reference/savingsplans/describe-savings-plans-offerings.html

## Issues Found
- AWS now documents four Savings Plans types, including Database Savings Plans. Updated the post from three types to four and added a brief Database Savings Plans note.
- Compute Savings Plans are documented as up to 66% off On-Demand rates, not a generic 40-60% range. Updated that discount statement.
- SageMaker Savings Plans are now documented as SageMaker AI Savings Plans. Updated the naming.
- The hourly spend script claimed hourly analysis but used daily Cost Explorer granularity and divided daily totals by 24. Updated it to use `Granularity="HOURLY"`, changed the default lookback to 14 days, and added the Cost Explorer hourly granularity caveat.
- The Savings Plans recommendation summary field `CurrentOnDemandSpend` is a total over the lookback period, not an hourly value. Updated the output label.
- The CLI example used `describe-savings-plan-rates`, which describes rates for an existing Savings Plan and does not support the shown `instanceFamily` filter. Replaced it with `describe-savings-plans-offering-rates` and current option/value names.
- The available offerings CLI example used outdated/incorrect option names and enum values. Updated it to `--product-type "EC2"`, `--plan-types "Compute"`, `--payment-options "No Upfront"`, and a one-year duration of `31536000` seconds.
- The payment comparison text implied exact discount percentages for all one-year Compute Savings Plans. Added a caveat that exact discounts vary by usage type and offering.
- The purchase strategy referenced 30 days of usage even though the corrected hourly script uses a 14-day hourly Cost Explorer lookback. Updated the step to "recent usage."

## Review Notes
The Python snippets were syntax-checked locally with `compile()`. The AWS CLI was not installed in this environment, so CLI verification was performed against the current official AWS CLI command reference.
