# Validation Summary: Calculate Databricks Cost per Job Run

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Databricks Lakeflow Jobs
- Databricks classic jobs compute and serverless compute
- Unity Catalog system tables
- Databricks SQL
- AWS Cost and Usage Reports and Data Exports
- Azure Cost Management exports
- Google Cloud Billing export to BigQuery
- FinOps cost attribution and reconciliation

## Sources Consulted
- [Databricks billable usage system table reference](https://docs.databricks.com/aws/en/admin/system-tables/billing)
- [Databricks pricing system table reference](https://docs.databricks.com/aws/en/admin/system-tables/pricing)
- [Databricks monitor costs using system tables](https://docs.databricks.com/aws/en/admin/usage/system-tables)
- [Databricks monitor job costs and performance with system tables](https://docs.databricks.com/aws/en/admin/system-tables/jobs-cost)
- [Databricks jobs system table reference](https://docs.databricks.com/aws/en/admin/system-tables/jobs)
- [Databricks SQL parameter markers](https://docs.databricks.com/aws/en/sql/language-manual/sql-ref-parameter-marker)
- [Databricks monitor the cost of serverless compute](https://docs.databricks.com/aws/en/admin/system-tables/serverless-billing)
- [Databricks serverless compute overview](https://docs.databricks.com/aws/en/compute/serverless)
- [Databricks pool configuration reference](https://docs.databricks.com/aws/en/compute/pools)
- [Databricks pool best practices](https://docs.databricks.com/aws/en/compute/pool-best-practices)
- [Databricks tags for usage attribution](https://docs.databricks.com/aws/en/admin/account-settings/usage-detail-tags)
- [Databricks Jobs API: get a run](https://docs.databricks.com/api/workspace/jobs/getrun)
- [Databricks Jobs API: repair a run](https://docs.databricks.com/api/workspace/jobs/repairrun)
- [AWS EC2 On-Demand instance billing](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-on-demand-instances.html)
- [AWS Cost and Usage Reports](https://docs.aws.amazon.com/cur/latest/userguide/what-is-cur.html)
- [Azure Cost Management exports](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-improved-exports)
- [Google Cloud Billing export to BigQuery](https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery)

## Issues Found
- The list-price SQL joined `system.billing.usage` to `system.billing.list_prices` only by SKU. This can match a price for the wrong cloud or duplicate usage in a multi-cloud account. Added the documented `cloud` join, exposed the cloud and currency in the result, and grouped by those fields.
- The direct-attribution statement applied to all jobs on jobs or serverless compute. Databricks documents that notebook `WORKFLOW_RUN` entries are an exception because their usage is attributed to the parent notebook. Added that exception.
- The provider-tag guidance implied uniform propagation. On AWS, pool-backed instances inherit workspace and pool tags but not cluster tags. Replaced the generalization with configuration-specific guidance and the documented AWS example.
- Idle pool infrastructure cost was listed without distinguishing it from run-metered cost. Clarified that idle pool cost must be allocated using a documented rule.
- The task-run timeline guidance implied that it explained every phase. Its phase-duration fields are unavailable on rows emitted before early December 2025, it does not expose queue duration, and job-run duration fields are populated only for legacy single-task jobs. Added these limitations.
- A validation step said failed and canceled runs should receive cost, although a run canceled before compute assignment can incur no cost. Clarified that any cost actually incurred by those runs must be attributed to them.

## Review Notes
The corrected SQL uses Databricks parameter markers and the current `pricing.effective_list.default` field. Retractions and restatements are correctly included in aggregation so billing corrections net out. Repair executions remain part of the original job run, while externally launched replacement runs require a separate business-level correlation key. The cloud billing export links are current; the Azure and Google links in the post redirect to their current canonical documentation pages.
