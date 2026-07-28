# Validation Summary: Can You Cancel, Modify, Transfer, or Return an AWS Savings Plan?

## Status

validated

## Post Type

Reference guide

## Technologies Covered

- AWS Savings Plans
- AWS Billing and Cost Management
- AWS Organizations and consolidated billing
- Savings Plans discount sharing
- AWS Identity and Access Management (IAM)
- Savings Plans API

## Sources Consulted

- [Savings Plans types](https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html)
- [Returning a purchased Savings Plan](https://docs.aws.amazon.com/savingsplans/latest/userguide/return-sp.html)
- [Savings Plans quotas and restrictions](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-quotas.html)
- [Queuing a Savings Plan purchase](https://docs.aws.amazon.com/savingsplans/latest/userguide/queued-sp-cart.html)
- [Deleting a queued Savings Plan](https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-queued-delete.html)
- [Renewing a Savings Plan](https://docs.aws.amazon.com/savingsplans/latest/userguide/queue-sp-replace.html)
- [Understanding how Savings Plans apply to your usage](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html)
- [Understanding Savings Plans recommendation calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-rec-calculations.html)
- [Understanding Savings Plans Purchase Analyzer calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-purchase-analysis-calculations.html)
- [Purchasing Savings Plans](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-purchase.html)
- [Reserved Instances and Savings Plans discount sharing](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/ri-turn-off.html)
- [Savings Plans API operations](https://docs.aws.amazon.com/savingsplans/latest/APIReference/API_Operations.html)
- [SavingsPlan API data type](https://docs.aws.amazon.com/savingsplans/latest/APIReference/API_SavingsPlan.html)
- [IAM actions, resources, and condition keys for AWS Savings Plans](https://docs.aws.amazon.com/service-authorization/latest/reference/list_savingsplans.html)
- [AWS Service Terms](https://aws.amazon.com/service-terms/)
- [Amazon EC2 Reserved Instance Marketplace restrictions](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ri-market-general.html)

## Issues Found

- The queued-purchase section said a purchase is both validated and invoiced at its exact start time. AWS documents that it is processed and validated at the start time, while validation and invoicing must complete within the same calendar month as the start date. The sentence was corrected to avoid claiming that invoicing necessarily occurs at the exact start time.

## Review Notes

No code examples, terminal commands, or configuration snippets were present. Validation focused on AWS service behavior, limits, IAM action names, API capabilities, billing-transfer rules, discount-sharing behavior, renewal semantics, and documentation links. All other technical claims reviewed were consistent with the current official AWS documentation.
