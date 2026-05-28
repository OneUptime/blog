# Validation Summary: How to Migrate Amazon Redshift Data Warehouse to Google BigQuery

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Amazon Redshift
- Amazon S3
- Google Cloud Storage
- Storage Transfer Service
- BigQuery
- BigQuery Migration API / SQL translation
- Terraform Google provider
- Python, psycopg2, google-cloud-bigquery, google-cloud-storage
- Google Cloud CLI and bq CLI

## Sources Consulted
- Amazon Redshift UNLOAD documentation: https://docs.aws.amazon.com/redshift/latest/dg/r_UNLOAD.html
- Google Cloud Storage Transfer Service gcloud reference: https://docs.cloud.google.com/sdk/gcloud/reference/transfer/jobs/create
- BigQuery Parquet load documentation: https://docs.cloud.google.com/bigquery/docs/loading-data-cloud-storage-parquet
- BigQuery SQL translation API documentation: https://docs.cloud.google.com/bigquery/docs/api-sql-translator
- BigQuery Migration API REST reference: https://docs.cloud.google.com/bigquery/docs/reference/migration/rest/v2/projects.locations.workflows
- BigQuery TIMESTAMP functions: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/timestamp_functions
- BigQuery DATE functions: https://cloud.google.com/bigquery/docs/reference/standard-sql/date_functions
- BigQuery partitioned table documentation: https://docs.cloud.google.com/bigquery/docs/partitioned-tables
- BigQuery clustered table documentation: https://cloud.google.com/bigquery/docs/creating-clustered-tables
- Terraform google_bigquery_dataset resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/bigquery_dataset

## Issues Found
- The post description said the migration used BigQuery Data Transfer Service, but the procedure uses Storage Transfer Service for S3-to-GCS movement. Updated the description to name Storage Transfer Service.
- Redshift UNLOAD output paths were later loaded with a `*.parquet` wildcard, but UNLOAD does not append an extension unless `EXTENSION` is specified. Added `EXTENSION 'parquet'` to the UNLOAD examples.
- The generated UNLOAD command used `MAXFILESIZE 1073741824`; Redshift documents `MAXFILESIZE` in MB or GB units, with MB as the default. Replaced it with `MAXFILESIZE 1 GB`.
- The load examples used explicit schema autodetection for Parquet. BigQuery reads Parquet schemas from the self-describing source data, so the examples now omit the unnecessary setting and describe the behavior accurately.
- The BigQuery equivalent for a timestamp-style `DATEADD` example used `DATE_ADD`, which only applies to `DATE` values. Changed it to `TIMESTAMP_ADD` for the `created_at` timestamp-style column used in the article.
- The SQL translation command used a nonexistent `gcloud migration sql-translation translate` command. Replaced it with a documented BigQuery Migration API `workflows.create` example for `Redshift2BigQuery_Translation`.
- The optimization examples attempted to `CREATE OR REPLACE` a table while selecting from the same table. BigQuery's documented pattern is to create a new partitioned or clustered table from the query result, so the examples now create `_optimized` copies.
- The validation section claimed to compare row counts and checksums, but the code only compares row counts. Updated the text to match the code.

## Review Notes
The migration guide is technically valid after the corrections. Future improvements could include quoting generated Redshift identifiers, adding value-level checksum validation, and noting that Redshift distribution/sort keys do not map one-to-one to BigQuery clustering and partitioning choices.
