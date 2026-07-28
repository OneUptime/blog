# Validation Summary: How Do You Calculate the Right AWS Savings Plans Hourly Commitment?

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- AWS Savings Plans
- AWS Cost Explorer
- AWS Cost and Usage Reports (AWS CUR)
- AWS Data Exports
- AWS Organizations discount sharing
- AWS Budgets
- Amazon EC2 Reserved Instances
- Amazon EC2, AWS Fargate, AWS Lambda, Amazon SageMaker AI, and AWS database services
- FinOps commitment sizing and capacity planning

## Sources Consulted

- [What are Savings Plans?](https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html)
- [Savings Plans types](https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html)
- [Compute Savings Plans and Reserved Instances](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-ris.html)
- [Understanding how Savings Plans apply to your usage](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html)
- [Understanding your Savings Plans recommendation calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-rec-calculations.html)
- [Understanding Savings Plans recommendations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-recommendations.html)
- [Understanding Savings Plans purchase-analysis calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-purchase-analysis-calculations.html)
- [Running a Savings Plan purchase analysis](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-purchase-analysis.html)
- [Reviewing your Savings Plan purchase analysis](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-review-purchase-analysis.html)
- [Cost and usage data for all AWS services at hourly granularity](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-services-hourly.html)
- [Understanding Savings Plans in AWS Data Exports](https://docs.aws.amazon.com/cur/latest/userguide/cur-sp.html)
- [Understanding Savings Plans utilization metrics and calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-pr-metrics.html)
- [Understanding Savings Plans coverage metrics and calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-cr-metrics.html)
- [Creating a Savings Plans budget](https://docs.aws.amazon.com/cost-management/latest/userguide/create-savingsplans-budget.html)
- [Announcing Database Savings Plans with up to 35% savings](https://aws.amazon.com/about-aws/whats-new/2025/12/database-savings-plans-savings/)
- [AWS Lambda participates in Compute Savings Plans](https://aws.amazon.com/about-aws/whats-new/2020/02/aws-lambda-participates-in-compute-savings-plans/)

## Issues Found

No technical issues found.

## Review Notes

- The hourly formulas are correctly presented as a simplified planning model. Actual AWS application also considers RI priority, plan-type priority, highest discount percentage, lowest Savings Plans rate for ties, owner-account priority, and Organizations sharing.
- Cost Explorer hourly data is opt-in, can take up to 48 hours to become available, and covers the previous 14 days. AWS CUR or CUR 2.0 through Data Exports is the more suitable source when a longer representative hourly history is required.
- Lambda request charges receive no discount but can still be covered by Compute Savings Plans commitment; other Lambda charge categories must be checked for eligibility rather than treating the entire Lambda bill as discounted usage.
- Database Savings Plans were verified as a one-year, No Upfront commitment offering as of the validation date.
