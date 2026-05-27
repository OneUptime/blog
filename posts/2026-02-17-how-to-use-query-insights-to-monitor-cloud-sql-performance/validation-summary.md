# Validation Summary: How to Use Query Insights to Monitor Cloud SQL Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud SQL
- Cloud SQL Query Insights
- Google Cloud CLI (`gcloud`)
- Terraform Google provider
- Cloud Monitoring
- PostgreSQL
- MySQL
- Python database clients (`psycopg2`, `mysql.connector`)
- sqlcommenter

## Sources Consulted
- Google Cloud SQL for PostgreSQL Query Insights documentation: https://docs.cloud.google.com/sql/docs/postgres/using-query-insights
- Google Cloud SQL for MySQL Query Insights documentation: https://docs.cloud.google.com/sql/docs/mysql/using-query-insights
- Google Cloud SDK `gcloud sql instances patch` reference: https://docs.cloud.google.com/sdk/gcloud/reference/sql/instances/patch
- Google Cloud SDK `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud SDK `gcloud monitoring` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring
- Cloud SQL metrics reference: https://docs.cloud.google.com/sql/docs/mysql/admin-api/metrics
- Cloud Monitoring `projects.timeSeries.list` API reference: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.timeSeries/list
- sqlcommenter specification: https://google.github.io/sqlcommenter/spec/
- Terraform Google provider `google_sql_database_instance` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance

## Issues Found
- The post stated Query Insights history was up to 7 days without qualification. Updated it to note 7 days for Cloud SQL Enterprise edition and up to 30 days for Cloud SQL Enterprise Plus edition.
- The post stated `query_string_length` was capped at 4500. Updated it to clarify this is the Cloud SQL Enterprise edition limit and that Enterprise Plus supports longer query text.
- The post implied every query has an execution plan available. Updated the wording to say sampled execution plans are shown when plan samples are available.
- The PostgreSQL application-tag example used unsupported `cloudsql.enable_tag` and `cloudsql.application_tag` settings. Replaced it with a sqlcommenter-format SQL comment.
- The MySQL application-tag example used an unsupported optimizer-hint-style `TAG()` comment. Replaced it with a sqlcommenter-format SQL comment.
- The alerting command used invalid `gcloud monitoring policies create` flags (`--condition-threshold-value` and `--condition-threshold-duration`). Replaced them with the current `--if` and `--duration` flags, and aligned the example text with CPU utilization.
- The export section used a nonexistent `gcloud monitoring export create` command and incorrectly pointed readers to the Cloud SQL Admin API for query statistics. Replaced it with a Cloud Monitoring API `timeSeries` example and pointed readers to the Cloud Monitoring API.
- The overhead section claimed a fixed 1-2% overhead that was not supported by official Cloud SQL Query Insights documentation. Replaced it with the documented caveat that increasing query plan sampling can add performance overhead.

## Review Notes
The Terraform `insights_config` block and `gcloud sql instances patch` Query Insights flags matched current documentation. The post could later be improved by adding a note that Cloud Trace API access may be required for query plans and end-to-end views, but that was not necessary to correct the existing examples.
