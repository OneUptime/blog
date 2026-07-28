# Validation Summary: Why Unused Savings Plans Commitment Does Not Roll Over to the Next Hour

## Status

validated

## Post Type

Technical guide and FinOps reference

## Technologies Covered

- AWS Savings Plans
- Compute Savings Plans
- EC2 Instance Savings Plans
- SageMaker AI Savings Plans
- Database Savings Plans
- AWS Organizations consolidated billing
- AWS Billing and Cost Management
- AWS Cost Explorer utilization and coverage reports
- AWS Budgets
- Savings Plans Purchase Analyzer
- FinOps commitment sizing

## Sources Consulted

- [What are Savings Plans?](https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html)
- [Savings Plans types](https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html)
- [AWS Savings Plans FAQ](https://aws.amazon.com/savingsplans/faqs/)
- [Database Savings Plans pricing](https://aws.amazon.com/savingsplans/database-pricing/)
- [Compute Savings Plans and Reserved Instances](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-ris.html)
- [Understanding how Savings Plans apply to your usage](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html)
- [Understanding utilization metrics and calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-pr-metrics.html)
- [Understanding coverage metrics and calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-cr-metrics.html)
- [Creating a Savings Plans budget](https://docs.aws.amazon.com/cost-management/latest/userguide/create-savingsplans-budget.html)
- [Customizing AWS Billing discount-sharing preferences](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/billing-pref.html)
- [Understanding Savings Plans recommendation calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-rec-calculations.html)
- [Understanding Savings Plans Purchase Analyzer calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-purchase-analysis-calculations.html)
- [Reviewing a Savings Plan purchase analysis](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-review-purchase-analysis.html)

## Issues Found

No technical issues found.

## Review Notes

- The post contains no executable code, terminal commands, or configuration snippets. The simplified hourly equations are mathematically consistent with AWS's documented commitment application model.
- AWS explicitly states that each hour's commitment can be used only within that hour and cannot be carried over.
- The current AWS Database Savings Plans pricing page and FAQ confirm the one-year, No Upfront offering described in the post.
- The plan scopes, Reserved Instance and Savings Plans application order, owner-account priority, and current open, prioritized-group, and restricted-group sharing behavior are accurately described.
- The utilization and coverage definitions, hourly/daily/monthly report granularity, Savings Plans Budgets delay of up to 48 hours, 7/30/60-day recommendation lookbacks, and lack of future-usage forecasting are current.
- All external links in the post point to the intended official AWS resources.
