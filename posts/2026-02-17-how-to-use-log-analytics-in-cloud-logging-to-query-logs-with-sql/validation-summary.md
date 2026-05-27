# Validation Summary: How to Use Log Analytics in Cloud Logging to Query Logs with SQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Logging
- Log Analytics
- BigQuery / GoogleSQL
- Google Cloud CLI
- Terraform Google provider

## Sources Consulted
- Google Cloud Logging: Query and view log entries with Log Analytics: https://docs.cloud.google.com/logging/docs/log-analytics
- Google Cloud Logging: Configure log buckets: https://docs.cloud.google.com/logging/docs/buckets
- Google Cloud Logging: Sample SQL queries: https://docs.cloud.google.com/logging/docs/analyze/examples
- Google Cloud Logging: Query and analyze logs with Log Analytics: https://docs.cloud.google.com/logging/docs/analyze/query-and-view
- Google Cloud Logging: SQL queries for security insights: https://docs.cloud.google.com/logging/docs/analyze/analyze-audit-logs
- Google Cloud Observability pricing: https://cloud.google.com/stackdriver/pricing
- Google Cloud SDK: gcloud logging buckets update: https://cloud.google.com/sdk/gcloud/reference/logging/buckets/update
- Google Cloud SDK: gcloud logging links create: https://docs.cloud.google.com/sdk/gcloud/reference/logging/links/create
- Terraform Registry: google_logging_project_bucket_config: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/logging_project_bucket_config
- Terraform Registry: google_logging_linked_dataset: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/logging_linked_dataset

## Issues Found
- The post stated that the `_Required` bucket always has Log Analytics enabled. Official docs say system-created buckets can be upgraded to use analytics, not that `_Required` is always enabled. I changed the wording to say `_Required`, `_Default`, and custom buckets can be upgraded.
- The post implied Log Analytics query costs may apply at scale. Official pricing states there is no charge to upgrade a bucket or issue SQL queries from the Log Analytics page, while BigQuery analysis charges apply for linked datasets queried from BigQuery. I updated the cost note accordingly.
- The `_Default` bucket upgrade command omitted the recommended `--async` flag. I added it and adjusted the note to describe the upgrade as asynchronous.
- The HTTP request query used `http_request IS NOT NULL`. Google SQL examples for Log Analytics explicitly recommend checking a subfield of the RECORD instead. I changed the filter to `http_request.status IS NOT NULL`.
- The linked dataset command used a non-existent `--linked-dataset` flag. The `gcloud logging links create` command uses the positional `LINK_ID` as the BigQuery dataset name. I removed the invalid flag and used `log_analytics_linked` as the link ID.

## Review Notes
The local environment did not have `gcloud` or `terraform` installed, so CLI and Terraform validation was performed against official Google Cloud SDK and Terraform provider documentation. The SQL examples follow the documented Log Analytics log-view path format and fixed `LogEntry` schema.
