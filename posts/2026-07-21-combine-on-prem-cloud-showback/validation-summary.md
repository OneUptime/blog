# Validation Summary: How to Combine On-Premises and Cloud Costs in One Showback Model

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- FinOps Framework
- FinOps showback and cost allocation
- Hybrid cloud and data center cost modeling
- FinOps Open Cost and Usage Specification (FOCUS) v1.4
- Public cloud billing and cost exports
- Commitment-aware effective and amortized cost
- Internal service rate cards, shared-cost allocation, and idle-capacity reporting
- CMDB, resource metadata, tags, and effective-dated ownership mappings

## Sources Consulted

- [FinOps Foundation: FinOps for Data Center](https://www.finops.org/framework/technology-categories/data-center/)
- [FinOps Foundation: FinOps for Data Center — Practical Cost Modeling & FOCUS Alignment](https://www.finops.org/wg/finops-for-data-center-practical-cost-modeling-focus-alignment/)
- [FinOps Foundation: Allocation](https://www.finops.org/framework/capabilities/allocation/)
- [FOCUS: The unifying language for technology value](https://focus.finops.org/)
- [FOCUS Specification v1.4](https://focus.finops.org/focus-specification/v1-4/)
- [AWS Data Exports: Understanding your amortized reservation data](https://docs.aws.amazon.com/cur/latest/userguide/amortized-reservation.html)
- [AWS Data Exports: Understanding export delivery](https://docs.aws.amazon.com/cur/latest/userguide/dataexports-export-delivery.html)
- [Microsoft Cost Management: View savings plan cost and usage details](https://learn.microsoft.com/en-us/azure/cost-management-billing/savings-plan/utilization-cost-reports)
- [Google Cloud Billing: Structure of FOCUS data export](https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery-tables/focus-export)
- [Google Cloud Billing: Structure of Standard data export](https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery-tables/standard-usage)

## Issues Found
No technical issues found.

## Review Notes
FOCUS v1.4 is a published specification as of the validation date. Native provider export support can lag the latest specification version, but the post correctly describes a common FOCUS-aligned model and does not claim that every provider currently emits a native v1.4 dataset. The internal rate formula, practical-capacity treatment, idle-capacity policies, staged allocation approach, reconciliation controls, and FOCUS cost semantics are consistent with the consulted official guidance. The post contains no executable code or terminal commands requiring runtime validation.
