# Validation Summary: All Upfront vs Partial Upfront vs No Upfront Savings Plans: Which Costs Least?

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
- AWS Billing and Cost Management
- AWS Cost Explorer
- AWS Cost and Usage Reports and Data Exports
- FinOps cash-flow and present-value analysis

## Sources Consulted

- [AWS Savings Plans FAQ](https://aws.amazon.com/savingsplans/faqs/)
- [What are Savings Plans?](https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html)
- [Savings Plans types](https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html)
- [Compute Savings Plans and Reserved Instances](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-ris.html)
- [Purchasing a custom Savings Plan commitment](https://docs.aws.amazon.com/savingsplans/latest/userguide/purchase-sp-direct.html)
- [Reviewing and finalizing Savings Plans purchases](https://docs.aws.amazon.com/savingsplans/latest/userguide/review-purchase-cart.html)
- [Understanding how Savings Plans apply to your usage](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html)
- [Understanding utilization metrics and calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-pr-metrics.html)
- [AWS Savings Plans API: CreateSavingsPlan](https://docs.aws.amazon.com/savingsplans/latest/APIReference/API_CreateSavingsPlan.html)
- [Exploring your data using Cost Explorer](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-exploring-data.html)
- [AWS Cost and Usage Reports: Understanding Savings Plans](https://docs.aws.amazon.com/cur/latest/userguide/cur-sp.html)
- [AWS Cost and Usage Reports: Savings Plans details](https://docs.aws.amazon.com/cur/latest/userguide/savingsplans-columns.html)
- [Returning a purchased Savings Plan](https://docs.aws.amazon.com/savingsplans/latest/userguide/return-sp.html)
- [Savings Plans quotas and restrictions](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-quotas.html)

## Issues Found

- The post originally instructed readers to hold the purchased hourly commitment constant when comparing payment options, then concluded that All Upfront would have the lowest nominal total. AWS defines the hourly commitment at the Savings Plans rate, not at the On-Demand rate. For the same term, an equal dollar-per-hour commitment has the same nominal commitment total across payment schedules but covers different amounts of eligible usage because the rates differ. The comparison criteria now hold the eligible usage profile and coverage target constant, and the post explains that each option must be sized using its own Savings Plans rates.
- Related references to a general price ranking were clarified as a Savings Plans rate ranking. The nominal-cost conclusion is now explicitly scoped to equivalent eligible usage and coverage under otherwise comparable offerings.

## Review Notes

- The post contains no executable code, terminal commands, or configuration snippets. Its present-value expression is a conceptually correct finance formula, with the discount-rate convention appropriately delegated to the organization's finance team.
- The current AWS FAQ confirms that Database Savings Plans are limited to a one-year, No Upfront offering. The three payment options discussed in the article apply to Compute, EC2 Instance, and SageMaker AI Savings Plans.
- AWS currently allows returns only for eligible active Savings Plans with commitments of $100 per hour or less, purchased within the last seven days and the same UTC calendar month, subject to the return quota and additional restrictions. The article accurately presents this as a narrow exception rather than a cancellation right.
- All external links in the post point to the intended official AWS resources.
