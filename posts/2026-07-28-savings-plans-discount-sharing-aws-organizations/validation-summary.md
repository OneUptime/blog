# Validation Summary: How Does Savings Plans Discount Sharing Work Across AWS Organizations?

## Status

validated

## Post Type

Technical reference and configuration guide

## Technologies Covered

- AWS Savings Plans
- AWS Organizations
- AWS consolidated billing
- Reserved Instances and Savings Plans discount sharing
- AWS Cost Categories
- AWS Cost and Usage Report (CUR) 2.0
- AWS Data Exports
- AWS Cost Explorer recommendations
- AWS Billing Conductor
- AWS billing transfer

## Sources Consulted

- [Reserved Instances and Savings Plans discount sharing](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/ri-turn-off.html)
- [Customizing your Billing preferences](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/billing-pref.html)
- [Understanding how Savings Plans apply to your usage](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html)
- [Understanding Savings Plans recommendations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-recommendations.html)
- [Understanding your recommendation calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-rec-calculations.html)
- [Consolidating billing for AWS Organizations](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/consolidated-billing.html)
- [Understanding Consolidated Bills](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/con-bill-blended-rates.html)
- [Transfer billing management to external accounts](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/orgs_transfer_billing.html)
- [Organizing costs using AWS Cost Categories](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/manage-cost-categories.html)
- [Understanding Savings Plans in AWS Data Exports](https://docs.aws.amazon.com/cur/latest/userguide/cur-sp.html)
- [AWS Savings Plans: How to Implement an Effective Chargeback Strategy](https://aws.amazon.com/blogs/aws-cloud-financial-management/aws-savings-plans-how-to-implement-an-effective-chargeback-strategy/)
- [Control Your AWS Commitments with Reserved Instances and Savings Plans Group Sharing](https://aws.amazon.com/blogs/aws-cloud-financial-management/control-your-aws-commitments-with-risp-group-sharing/)

## Issues Found

No technical issues found.

## Review Notes

- The post contains no code, commands, or configuration snippets, but it is technically substantive because it documents current AWS billing controls and discount-application behavior.
- AWS documentation also calls organization-wide sharing "open sharing"; the post's terminology is accurate and consistent with the sharing-options overview.
- The documented ordering is correct: applicable EC2 Reserved Instance benefits precede Savings Plans, EC2 Instance Savings Plans precede Compute Savings Plans, owner-account usage precedes shared-account usage, and eligible usage is prioritized by calculated savings percentage.
- The descriptions of prioritized and restricted group sharing, account-level activation, Cost Category account-group constraints, recommendation scope, final-bill timing, Billing Conductor behavior, and billing-transfer boundaries all match current AWS documentation.
- All external links in the post resolve to the intended AWS documentation or AWS Cloud Financial Management article.
