# Validation Summary: Should You Buy Savings Plans in the AWS Management Account or a Member Account?

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Savings Plans
- AWS Organizations and consolidated billing
- AWS Billing and Cost Management
- Savings Plans and Reserved Instances discount sharing
- AWS Cost Categories
- AWS billing transfer
- AWS Identity and Access Management (IAM)
- FinOps chargeback and showback

## Sources Consulted
- [Purchasing Savings Plans](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-purchase.html)
- [Understanding how Savings Plans apply to your usage](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html)
- [Understanding your recommendation calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-rec-calculations.html)
- [Reserved Instances and Savings Plans discount sharing](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/ri-turn-off.html)
- [Customizing your Billing preferences](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/billing-pref.html)
- [Understanding Consolidated Bills](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/con-bill-blended-rates.html)
- [Identity and Access Management for Savings Plans](https://docs.aws.amazon.com/savingsplans/latest/userguide/identity-access-management.html)
- [Viewing your Savings Plans inventory](https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-inventory.html)
- [Returning a purchased Savings Plan](https://docs.aws.amazon.com/savingsplans/latest/userguide/return-sp.html)
- [Best practices for the management account](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_best-practices_mgmt-acct.html)
- [Savings Plans and Reserved Instances Group Sharing is now generally available](https://aws.amazon.com/about-aws/whats-new/2025/11/savings-plans-reserved-instances-group-sharing-generally-available/)
- [Understanding AWS Savings Plan Recommendations: Payer vs. Linked Account Views](https://aws.amazon.com/blogs/aws-cloud-financial-management/understanding-aws-savings-plan-recommendations-payer-vs-linked-account-views/)
- [AWS Savings Plans: How to Implement an Effective Chargeback Strategy](https://aws.amazon.com/blogs/aws-cloud-financial-management/aws-savings-plans-how-to-implement-an-effective-chargeback-strategy/)

## Issues Found
- The post called the default organization-wide mode only “organization-wide sharing,” while the current Billing preferences documentation and console call it “Open sharing.” Changed the label to “Open (organization-wide) sharing” so it matches the current product terminology without losing the explanatory wording.
- The sharing-mode section did not state the regional availability limit for group sharing. Added that group sharing is available in all AWS Regions except AWS GovCloud (US) and China Regions.
- The post used “payer account” for the account that cannot join a sharing group. Because billing transfer introduces a separate payment destination, that term can be ambiguous. Changed it to “management account,” which matches the current Billing preferences documentation.
- The dedicated-account checklist said to monitor the account moving within the organization. Group-sharing Cost Categories use the Accounts dimension, so moving the same account between organizational units does not by itself change its account-based sharing-group membership. Removed that claim while retaining the valid warning about the owner account leaving the organization.

## Review Notes
The post contains no executable code, terminal commands, or configuration snippets, but it contains technical implementation guidance and was therefore fully reviewed rather than classified as a non-code blog. The owner-first application order, highest-calculated-savings priority, management-account versus member-account recommendation behavior, purchasing-account fee attribution, sharing activation requirements, billing-transfer boundary, `savingsplans:CreateSavingsPlan` IAM action, inventory visibility, Purchase Analyzer guidance, and limited return capability were verified against current AWS documentation.
