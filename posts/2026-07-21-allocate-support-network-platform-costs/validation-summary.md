# Validation Summary: Allocating Support, Networking, and Platform Costs Across Cloud Teams

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- FinOps shared-cost allocation, showback, and chargeback
- FinOps Open Cost and Usage Specification (FOCUS) 1.4, including `EffectiveCost` and `BilledCost`
- AWS Cost Categories split charge rules
- Azure Cost Management cost allocation rules
- Google Cloud Billing exports to BigQuery
- Kubernetes shared compute allocation using CPU and memory requests or usage
- Network cost allocation using billing dimensions, metrics, and flow logs

## Sources Consulted

- [FinOps Foundation: Allocation capability](https://www.finops.org/framework/capabilities/allocation/)
- [FOCUS Specification 1.4](https://focus.finops.org/focus-specification/v1-4/)
- [AWS: Splitting charges within Cost Categories](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/splitcharge-cost-categories.html)
- [AWS Support pricing](https://aws.amazon.com/premiumsupport/pricing/)
- [AWS: Understand codes for Amazon VPC in billing and usage reports](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-billing-usage-reports.html)
- [AWS: Flow log records](https://docs.aws.amazon.com/vpc/latest/userguide/flow-log-records.html)
- [Azure: Create and manage cost allocation rules](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/allocate-costs)
- [Google Cloud: Export Cloud Billing data to BigQuery](https://cloud.google.com/billing/docs/how-to/export-data-bigquery)
- [Google Cloud Customer Care](https://cloud.google.com/support)
- [Kubernetes: Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)

## Issues Found
No technical issues found.

## Review Notes
The post contains no executable code, commands, or configuration snippets, but it does contain technical implementation guidance and concrete cloud-provider feature claims, so it was reviewed as a technical guide. The FOCUS 1.4 definitions support the stated distinction between effective and billed cost. The documented AWS, Azure, and Google Cloud output semantics match the post, including the limitation that AWS split charge results do not affect Cost and Usage Reports or Cost Explorer, while Azure cost allocation data can appear in exports without changing the invoice. No changes to `README.md` were required.
