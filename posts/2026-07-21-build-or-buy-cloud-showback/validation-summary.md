# Validation Summary: Build or Buy? Choosing Tools for Cloud Showback and Cost Allocation

## Status

validated

## Post Type

Technical decision guide

## Technologies Covered

- FinOps Framework Automation, Tools, and Services capability
- FinOps cost allocation and cloud showback
- FinOps Open Cost and Usage Specification (FOCUS)
- AWS Billing and Cost Management, including cost allocation tags, Cost Categories, and split charge rules
- Microsoft Azure Cost Management cost allocation
- Kubernetes and observability-based shared-cost allocation
- Data warehouses, business-intelligence tools, service catalogs, CMDBs, and billing exports

## Sources Consulted

- [FinOps Foundation: Automation, Tools, and Services](https://www.finops.org/framework/capabilities/automation-tools-services/)
- [FinOps Foundation: FinOps Tools and Services](https://www.finops.org/wg/finops-tools-and-services/)
- [FinOps Foundation: Allocation](https://www.finops.org/framework/capabilities/allocation/)
- [FOCUS Specification v1.3](https://focus.finops.org/focus-specification/v1-3/)
- [AWS Billing: What is AWS Billing and Cost Management?](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/billing-what-is.html)
- [AWS Billing: Organizing costs using AWS Cost Categories](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/manage-cost-categories.html)
- [AWS Billing: Splitting charges within Cost Categories](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/splitcharge-cost-categories.html)
- [Microsoft Cost Management: Create and manage Azure cost allocation rules](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/allocate-costs)

## Issues Found

- The native-tooling discussion correctly listed the three AWS Cost Categories split-charge methods, but it did not state that split-charge results are limited to the Cost Categories details page and its CSV export. Added that they do not appear in the Cost and Usage Report, Cost Explorer, or other AWS Cost Management tools so readers do not assume those allocations propagate throughout AWS reporting.
- The Azure description correctly identified subscriptions, resource groups, and tags as allocation sources and targets, but it could imply that allocations change billing records or cover all charges. Clarified that allocation is a reporting operation, does not change the invoice, and does not support purchases such as reservations and savings plans.

## Review Notes

The post contains no executable code, commands, API calls, or configuration snippets. The `net_value` expression is explanatory pseudocode and is internally consistent. FOCUS terminology, the build/buy guidance, allocation practices, and the referenced official-documentation URLs were otherwise technically accurate as of the validation date.
