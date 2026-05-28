# Validation Summary: How to Migrate Azure Synapse Analytics to Google BigQuery

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Azure Synapse Analytics dedicated SQL pool and serverless SQL pool
- Google BigQuery and GoogleSQL
- BigQuery Data Transfer Service
- Google Cloud Storage Transfer Service
- BigQuery CLI (`bq`)
- Google Cloud CLI (`gcloud`)
- T-SQL, CETAS, Parquet, partitioning, clustering, stored procedures, scheduled queries, materialized views

## Sources Consulted
- Microsoft Learn: CREATE TABLE for Azure Synapse Analytics - https://learn.microsoft.com/en-us/sql/t-sql/statements/create-table-azure-sql-data-warehouse
- Microsoft Learn: CETAS with Synapse SQL - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/develop-tables-cetas
- Google Cloud: BigQuery default column values - https://cloud.google.com/bigquery/docs/default-values
- Google Cloud: BigQuery bq command-line tool reference - https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- Google Cloud: Storage Transfer Service `gcloud transfer jobs create` reference - https://cloud.google.com/sdk/gcloud/reference/transfer/jobs/create
- Google Cloud: Create Storage Transfer Service transfers - https://cloud.google.com/storage-transfer/docs/create-transfers
- Google Cloud: BigQuery Cloud Storage transfers - https://cloud.google.com/bigquery/docs/cloud-storage-transfer
- Google Cloud: Loading Parquet data from Cloud Storage - https://cloud.google.com/bigquery/docs/loading-data-cloud-storage-parquet
- Google Cloud: BigQuery scheduled queries - https://cloud.google.com/bigquery/docs/scheduling-queries
- Google Cloud: BigQuery temporary tables and query results - https://cloud.google.com/bigquery/docs/writing-results
- Google Cloud: BigQuery clustered tables - https://cloud.google.com/bigquery/docs/clustered-tables
- Google Cloud: BigQuery partitioned tables - https://cloud.google.com/bigquery/docs/partitioned-tables
- Google Cloud: BigQuery search indexes - https://cloud.google.com/bigquery/docs/search-index
- Google Cloud: BigQuery vector indexes - https://cloud.google.com/bigquery/docs/vector-index
- Google Cloud: BigQuery stored procedures - https://cloud.google.com/bigquery/docs/procedures
- Google Cloud: BigQuery materialized views - https://cloud.google.com/bigquery/docs/materialized-views-create

## Issues Found
- The Synapse table example used `DEFAULT GETDATE()`. Azure Synapse Analytics only allows literal or constant default expressions in `CREATE TABLE`, so I removed the unsupported default from the Synapse example and the matching BigQuery example.
- The post said BigQuery has no indexes. BigQuery does not use traditional table indexes for general analytical query tuning, but it does support specialized search and vector indexes, so I updated the wording.
- The Azure Blob to GCS transfer example used `gsutil` against an Azure Blob HTTPS wildcard and later used an invalid `azure://` Storage Transfer Service source with an empty `--source-agent-pool`. I replaced these with the documented Storage Transfer Service `gcloud transfer jobs create` syntax using an Azure Blob HTTPS source URL and `--source-creds-file`.
- The BigQuery Data Transfer Service Cloud Storage example used `WRITE_TRUNCATE` for `write_disposition`. Cloud Storage transfers support `APPEND` or `MIRROR`, so I changed the example to `MIRROR`.
- The temporary table section said BigQuery does not have temporary tables. BigQuery supports temporary tables in scripts and sessions, but not Synapse `#temp` syntax, so I corrected the wording.
- The BigQuery stored procedure parameter used the same style as a column reference. I renamed the parameter to `p_report_date` to avoid ambiguity in the predicate.
- The scheduled query example used `DATE(sale_date)` even though `sale_date` is already a `DATE`, and used integer date subtraction. I changed it to select `sale_date` directly and use `DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)`.

## Review Notes
The `bq load --autodetect` flag is not required for Parquet because BigQuery reads schema information from self-describing Parquet files, but it is accepted by the CLI and is not technically incorrect. The CETAS snippet assumes the external data source and file format objects have already been created; the post now says that explicitly.
