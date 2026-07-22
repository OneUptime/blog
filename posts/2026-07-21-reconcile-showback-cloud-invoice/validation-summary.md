# Validation Summary: How to Reconcile Showback Reports with the Cloud Provider Invoice

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- FinOps Open Cost and Usage Specification (FOCUS) v1.4
- AWS Billing and Cost Explorer
- Microsoft Azure Cost Management
- Google Cloud Billing reports and BigQuery billing export
- Showback cost allocation and cloud invoice reconciliation

## Sources Consulted
- [FOCUS specification v1.4](https://focus.finops.org/focus-specification/v1-4/)
- [AWS: Knowing the differences between Billing and Cost Explorer data](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/differences-billing-data-cost-explorer-data.html)
- [AWS: Understanding your bill](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/getting-viewing-bill.html)
- [AWS: Customizing your invoice preferences with AWS invoice configuration](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/invoice-configuration.html)
- [Azure: Understand Cost Management data](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/understand-cost-mgt-data)
- [Azure: Customize views in Cost Analysis](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/customize-cost-analysis-views)
- [Azure: View savings plan cost and usage details](https://learn.microsoft.com/en-us/azure/cost-management-billing/savings-plan/utilization-cost-reports)
- [Google Cloud: View charges on invoices](https://cloud.google.com/billing/docs/how-to/reports/charges-on-invoices)
- [Google Cloud: Structure of Standard data export](https://cloud.google.com/billing/docs/how-to/export-data-bigquery-tables/standard-usage)
- [Google Cloud: Billing export example queries](https://cloud.google.com/billing/docs/how-to/bq-examples)

## Issues Found
- The description of FOCUS `BilledCost` and `EffectiveCost` used shorthand that did not fully match the v1.4 definitions. Updated it to state that billed cost is the cost invoiced in a billing period, while effective cost is recognized against resources, services, or contract commitments in a charge period and can include the recognized portion of related purchases. This preserves the intended distinction while matching the current specification.

## Review Notes
- The post contains no executable code, CLI commands, or configuration snippets, but it is a technical guide because it gives implementation-level guidance about billing data grains, cost measures, reconciliation controls, and allocation lineage.
- The AWS, Azure, and Google Cloud provider-specific claims are supported by their current official documentation. In particular, Azure Cost Management excludes support charges, taxes, and credits from the cost data described by Microsoft, and Google Cloud BigQuery billing export supports invoice-month, credits, and cost-type analysis.
- All external documentation links in the post resolved successfully during validation.
