# Validation Summary: Why Cost Explorer Savings Plans Recommendations Can Overcommit Seasonal Workloads

## Status
validated

## Post Type
Technical FinOps guide

## Technologies Covered
- AWS Cost Explorer
- AWS Savings Plans (Compute, Database, EC2 Instance, and SageMaker AI)
- Savings Plans Purchase Analyzer
- AWS Organizations and Savings Plans discount sharing
- AWS Cost and Usage Reports (AWS CUR)
- AWS Data Exports and CUR 2.0

## Sources Consulted
- [Understanding your recommendation calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-rec-calculations.html)
- [Understanding Savings Plans recommendations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-recommendations.html)
- [Savings Plans types](https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html)
- [AWS Savings Plans FAQs](https://aws.amazon.com/savingsplans/faqs/)
- [Database Savings Plans pricing](https://aws.amazon.com/savingsplans/database-pricing/)
- [Understanding your analysis calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-purchase-analysis-calculations.html)
- [Running a Savings Plan purchase analysis](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-purchase-analysis.html)
- [Understanding how Savings Plans apply to your usage](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html)
- [Purchasing Savings Plans](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-purchase.html)
- [Reserved Instances and Savings Plans discount sharing](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/ri-turn-off.html)
- [Customizing your Billing preferences](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/billing-pref.html)
- [What is AWS Data Exports?](https://docs.aws.amazon.com/cur/latest/userguide/what-is-data-exports.html)
- [Cost and Usage Report (CUR) 2.0](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2.html)

## Issues Found
- The organization-sharing discussion described open, prioritized-group, and restricted-group modes only in terms of account eligibility. This was imprecise because prioritized group sharing changes application priority but allows remaining benefits to flow to other sharing-activated accounts, while restricted group sharing makes the group boundary exclusive. The sentence now describes both account scope and priority order.

## Review Notes
- The hourly replay formula is a conceptual risk model. An implementation must use the candidate plan's Savings Plans rates and reproduce the applicable RI, existing Savings Plans, and organization-sharing allocation rules.
- AWS currently recommends CUR 2.0 through AWS Data Exports for detailed cost and usage data; legacy AWS CUR remains documented and supports hourly granularity.
- Savings Plans types, terms, payment options, Purchase Analyzer inputs, and sharing modes are time-sensitive AWS offerings and were verified as of 2026-07-28.
