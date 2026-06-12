# Validation Summary: How to Build Cloud Cost Monitoring

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Cost Explorer API and boto3
- Google Cloud Billing export to BigQuery
- Azure Cost Management and Consumption Python SDKs
- Prometheus metrics, recording rules, and alert rules
- Alertmanager routing and receiver configuration
- Grafana dashboard queries
- Python Prometheus exporters

## Sources Consulted
- AWS Cost Explorer `GetCostAndUsage` API Reference: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetCostAndUsage.html
- AWS Cost Explorer `GetReservationUtilization` API Reference: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetReservationUtilization.html
- Boto3 Cost Explorer documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/ce.html
- Google Cloud Billing export to BigQuery documentation: https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery
- Google Cloud Billing BigQuery export schema documentation: https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery-tables/standard-usage
- Azure Cost Management Query Usage REST API: https://learn.microsoft.com/en-us/rest/api/cost-management/query/usage
- Azure `CostManagementClient` Python SDK documentation: https://learn.microsoft.com/en-us/python/api/azure-mgmt-costmanagement/azure.mgmt.costmanagement.costmanagementclient
- Azure Cost Management `QueryOperations.usage` Python SDK documentation: https://learn.microsoft.com/en-us/python/api/azure-mgmt-costmanagement/azure.mgmt.costmanagement.operations.queryoperations
- Azure Cost Management query model documentation: https://learn.microsoft.com/en-us/python/api/azure-mgmt-costmanagement/azure.mgmt.costmanagement.models.querydefinition
- Azure Consumption `BudgetsOperations` Python SDK documentation: https://learn.microsoft.com/en-us/python/api/azure-mgmt-consumption/azure.mgmt.consumption.operations.budgetsoperations
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/

## Issues Found
- AWS Cost Explorer client did not specify the documented Cost Explorer endpoint region. Updated the boto3 client to use `region_name='us-east-1'`.
- AWS Reserved Instance utilization grouped by `SERVICE`, but the official API only supports grouping `GetReservationUtilization` by `SUBSCRIPTION_ID`, and `Granularity` cannot be set with `GroupBy`. Updated the sample to collect overall monthly utilization from `Total`.
- AWS daily cost metric was defined but never populated. Added daily total updates from `ResultsByTime`.
- GCP setup selected detailed usage cost export but the code referenced the standard export table pattern. Updated the table pattern to `gcp_billing_export_resource_v1_*`.
- GCP BigQuery filters used `_PARTITIONTIME`, which is not guaranteed by the billing export schema. Updated filters to use `usage_start_time`.
- Azure Cost Management was described as real-time. Adjusted wording to direct querying for recent data, since cloud billing data has provider-side delay.
- Azure `CostManagementClient` constructor was called with `subscription_id`, but the documented constructor takes `credential` and optional `base_url`. Updated the client initialization.
- Azure budget listing used `CostManagementClient.budgets`, which is not part of the documented Cost Management client surface. Added `ConsumptionManagementClient` and used its `budgets.list(scope=...)` operation.
- Azure query examples used raw dictionaries and read a non-existent `Cost` alias. Updated the examples to use documented query model classes and read the `totalCost` aggregation alias.
- Azure daily cost metric was defined but not populated correctly. Added per-date aggregation before setting `azure_daily_cost_dollars`.
- Prometheus recording and report queries referenced metric names that did not exist in the exporters, including `aws_cost_by_service`, `gcp_cost_by_service`, and `azure_cost_by_service`. Updated queries to use the actual metric names and normalize Azure service labels with `label_replace`.
- Prometheus team aggregation mixed `label_value` and `tag_value` label names. Added `label_replace` for GCP team label normalization.
- Dashboard and report labels claimed month-to-date values while the exporters and rules produce current daily rollups. Updated the labels and run-rate forecast expression.
- Alertmanager examples used deprecated `match`, `match_re`, `source_match`, and `target_match` fields. Updated them to current `matchers`, `source_matchers`, and `target_matchers`.
- PagerDuty receiver used `service_key`; updated the example to use `routing_key` for the Events API v2 integration path documented by Alertmanager.

## Review Notes
Local validation confirmed that fenced Python, JSON, and YAML snippets parse after the edits. The examples are still illustrative and omit production hardening such as pagination, retries, credential scoping, and exporter state cleanup for deleted label sets.
