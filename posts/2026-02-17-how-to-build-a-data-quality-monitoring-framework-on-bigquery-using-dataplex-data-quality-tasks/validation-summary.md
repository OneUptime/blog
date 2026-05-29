# Validation Summary: How to Build a Data Quality Monitoring Framework on BigQuery

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Knowledge Catalog / Dataplex CLI
- Dataplex data quality tasks / CloudDQ
- BigQuery
- Cloud Storage
- Cloud Functions for Python
- Cloud Scheduler
- Slack webhooks

## Sources Consulted
- Google Cloud Knowledge Catalog data quality tasks: https://docs.cloud.google.com/dataplex/docs/check-data-quality
- Google Cloud Knowledge Catalog data quality tasks overview: https://docs.cloud.google.com/dataplex/docs/data-quality-tasks-overview
- Google Cloud SDK `gcloud dataplex tasks create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/dataplex/tasks/create
- Google Cloud SDK `gcloud dataplex datascans create data-quality` reference: https://docs.cloud.google.com/sdk/gcloud/reference/dataplex/datascans/create/data-quality
- GoogleCloudPlatform CloudDQ reference guide: https://raw.githubusercontent.com/GoogleCloudPlatform/cloud-data-quality/main/REFERENCE.md
- BigQuery dataset creation documentation: https://cloud.google.com/bigquery/docs/datasets
- Cloud Scheduler HTTP job reference: https://docs.cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- Cloud Run functions Python HTTP sample: https://cloud.google.com/functions/docs/samples/functions-helloworld-http

## Issues Found
- The post used the older product name "Dataplex Data Quality Tasks" without noting the current Knowledge Catalog naming. Updated the body text and diagram to use Knowledge Catalog data quality tasks while preserving the Dataplex CLI context.
- The setup enabled only the Dataplex API. Current task setup also requires the Dataproc API and Private Google Access for the task subnet, so those prerequisites were added.
- The CloudDQ `row_filters` examples used direct string values. CloudDQ expects row filter entries with `filter_sql_expr`, so the YAML was corrected.
- The examples used `NOT_NULL` with `custom_sql_expr` params and a non-existent `UNIQUENESS` rule type. Changed the affected rules to valid `CUSTOM_SQL_EXPR` and `CUSTOM_SQL_STATEMENT` rules.
- The custom SQL statement for referential integrity queried the source table directly. CloudDQ `CUSTOM_SQL_STATEMENT` rules must query from the `data` CTE, so the query was corrected.
- The task creation command used an unsupported main class and `--gcs_path` argument. Replaced it with the documented CloudDQ PySpark driver, required public artifact URIs, and positional `TASK_ARGS`.
- The target result table used `dq_summary`, which Google documents as reserved for internal processing. Renamed the final result table to `dq_results` and updated all downstream queries.
- The SQL and Python alert examples calculated pass rates from `success_count / rows_validated`, which does not work for `CUSTOM_SQL_STATEMENT` rules because those fields are null. Updated them to use `success_percentage` for row-level rules and `complex_rule_validation_success_flag` / `complex_rule_validation_errors_count` for statement rules.
- The alerting section described Cloud Monitoring alerts, but the implementation was a Cloud Function posting to Slack. Updated the description to match the code.

## Review Notes
Knowledge Catalog data quality tasks are documented as a legacy CloudDQ-based offering; Google recommends evaluating Automatic data quality for new implementations. The local environment did not have `gcloud` installed, so CLI verification was performed against official Google Cloud SDK documentation instead of local `--help` output.
