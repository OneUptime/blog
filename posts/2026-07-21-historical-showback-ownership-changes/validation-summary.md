# Validation Summary: How to Preserve Historical Showback Accuracy When Resource Ownership Changes

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Cloud showback and FinOps cost allocation
- AWS cost allocation tags, Cost Explorer, Data Exports, and Cost and Usage Reports
- Google Cloud Billing exports to BigQuery, labels, and project hierarchy
- Azure Cost Management resource tags and tag inheritance
- FinOps Open Cost and Usage Specification (FOCUS)
- Effective-dated and bitemporal data modeling
- SQL temporal joins

## Sources Consulted

- [FinOps Foundation: Allocation](https://www.finops.org/framework/capabilities/allocation/)
- [FOCUS Specification v1.4](https://focus.finops.org/focus-specification/v1-4/)
- [AWS Billing: Backfill cost allocation tags](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-allocation-backfill.html)
- [AWS Billing and Cost Management API: StartCostAllocationTagBackfill](https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_StartCostAllocationTagBackfill.html)
- [Google Cloud Billing: Structure of Standard data export](https://cloud.google.com/billing/docs/how-to/export-data-bigquery-tables/standard-usage)
- [Google Cloud Billing: Structure of Detailed data export](https://cloud.google.com/billing/docs/how-to/export-data-bigquery-tables/detailed-usage)
- [Google Cloud Billing: Understand the Cloud Billing data tables in BigQuery](https://cloud.google.com/billing/docs/how-to/export-data-bigquery-tables)
- [Google Cloud Billing: Analyzing costs by project hierarchy](https://cloud.google.com/billing/docs/how-to/reports-project-hierarchy)
- [Azure Cost Management: Understand Cost Management data](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/understand-cost-mgt-data)
- [Azure Cost Management: Group and allocate costs using tag inheritance](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/enable-tag-inheritance)
- [PostgreSQL: Table Expressions](https://www.postgresql.org/docs/current/queries-table-expressions.html)
- [PostgreSQL: Conditional Expressions](https://www.postgresql.org/docs/current/functions-conditional.html)
- [PostgreSQL: Date/Time Types](https://www.postgresql.org/docs/current/datatype-datetime.html)

## Issues Found

- The temporal join used `charge_period_start` but described the condition as though it covered the entire charge time. A source row can span an ownership boundary, in which case assigning solely by its start silently gives the whole row to the starting owner. The text now identifies the query as a start-time attribution policy and requires finer-grained data or a documented split rule for rows that cross a transfer.

## Review Notes

The AWS, Google Cloud, and Azure metadata-history claims match the current provider documentation. The named FOCUS columns remain valid in FOCUS 1.4, and the FinOps Allocation metrics claim is supported by the current capability page. All external links in the post returned HTTP 200 during validation. The SQL executed successfully against PostgreSQL 14.17 with compatible timestamp columns; an implementation should keep charge and ownership timestamps in a consistent time-zone convention.
