# Validation Summary: How to Manage AWS Savings Plans with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Savings Plans
- AWS CLI
- AWS Cost Explorer
- AWS Budgets
- AWS provider for Terraform/OpenTofu

## Sources Consulted
- AWS Savings Plans types: https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html
- AWS CLI `start-savings-plans-purchase-recommendation-generation`: https://docs.aws.amazon.com/cli/latest/reference/ce/start-savings-plans-purchase-recommendation-generation.html
- AWS CLI `get-savings-plans-purchase-recommendation`: https://docs.aws.amazon.com/cli/latest/reference/ce/get-savings-plans-purchase-recommendation.html
- AWS CLI `describe-savings-plans-offerings`: https://docs.aws.amazon.com/cli/latest/reference/savingsplans/describe-savings-plans-offerings.html
- AWS Budgets `Budget` API reference: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_budgets_Budget.html
- AWS Savings Plans budgets guide: https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-create-savingsplans-budget.html
- Terraform AWS provider `aws_savingsplans_savings_plan` resource: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/savingsplans_savings_plan.html.markdown
- Terraform AWS provider `aws_savingsplans_savings_plan` data source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/savingsplans_savings_plan.html.markdown
- Terraform AWS provider `aws_budgets_budget` resource: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/budgets_budget.html.markdown

## Issues Found
- The post used a nonexistent AWS provider resource name, `aws_savingsplans_plan`. I changed all Savings Plans resource examples to the supported `aws_savingsplans_savings_plan` resource.
- The purchase examples used unsupported arguments (`savings_plan_type`, `payment_option`, and `term_duration_in_seconds`). I replaced those with the required `savings_plan_offering_id` pattern and updated the examples to show offering discovery via `aws savingsplans describe-savings-plans-offerings`.
- The post used a nonexistent plural data source, `aws_savingsplans_plans`. I replaced it with the supported `aws_savingsplans_savings_plan` data source, which looks up a plan by `savings_plan_id`.
- The Cost Explorer recommendation workflow skipped the required `start-savings-plans-purchase-recommendation-generation` step. I added that command before the `get-savings-plans-purchase-recommendation` example.
- The list of Savings Plans types was incomplete and outdated. I added Database Savings Plans and updated SageMaker naming/details to the current SageMaker AI Savings Plans terminology.
- The Savings Plans coverage budget used `limit_amount = "80"`, but AWS only allows `100` for Savings Plans utilization and coverage budgets. I corrected the budget limit to `100.0` and kept the alert threshold in the notification block.
- The introduction implied general lifecycle management without noting a key limitation. I clarified that active Savings Plans cannot be canceled after purchase.

## Review Notes
- The corrected examples follow the current AWS provider model, where plan type, payment option, and term are selected indirectly through a Savings Plans offering ID.
- The post assumes a current AWS provider version that includes `aws_savingsplans_savings_plan` and its matching data source.
