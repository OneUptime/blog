# Validation Summary: How to Choose Between BigQuery and Cloud SQL for Analytical Queries

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google BigQuery
- Google Cloud SQL
- Google Cloud Dataflow
- Google Cloud CLI
- PostgreSQL SQL
- BigQuery GoogleSQL

## Sources Consulted
- Google Cloud SQL overview: https://cloud.google.com/sql/docs/introduction
- Google Cloud CLI `gcloud sql connect` reference: https://cloud.google.com/sdk/gcloud/reference/sql/connect
- BigQuery pricing: https://cloud.google.com/bigquery/pricing
- BigQuery partitioned tables documentation: https://cloud.google.com/bigquery/docs/partitioned-tables
- BigQuery clustered tables documentation: https://cloud.google.com/bigquery/docs/clustered-tables
- BigQuery federated query functions: https://cloud.google.com/bigquery/docs/reference/standard-sql/federated_query_functions
- BigQuery Cloud SQL federated queries: https://cloud.google.com/bigquery/docs/cloud-sql-federated-queries
- BigQuery streaming inserts documentation: https://cloud.google.com/bigquery/docs/streaming-data-into-bigquery
- Dataflow PostgreSQL to BigQuery template documentation: https://cloud.google.com/dataflow/docs/guides/templates/provided/postgresql-to-bigquery
- Dataflow Google-provided templates list: https://cloud.google.com/dataflow/docs/guides/templates/provided-templates

## Issues Found
- BigQuery pricing examples used older simplified pricing of `$5/TB` for query processing and `$0.02/GB` for storage. Updated the examples to use current documented on-demand query pricing of `$6.25/TiB` and active logical storage pricing of about `$0.023/GiB`, with recalculated totals.
- The Dataflow command referenced a `Cloud_SQL_to_BigQuery` classic template with `gcloud dataflow jobs run --gcs-location`. Updated it to the documented PostgreSQL to BigQuery flex template invocation using `gcloud dataflow flex-template run`, `--template-file-gcs-location`, and the required template parameters.

## Review Notes
- The SQL snippets are example query patterns and are syntactically consistent with PostgreSQL or BigQuery GoogleSQL as presented.
- BigQuery cost examples still omit free-tier effects, location-specific pricing variation, cache behavior, and capacity pricing, which is acceptable for rough comparison but should be called out in future pricing-focused posts.
