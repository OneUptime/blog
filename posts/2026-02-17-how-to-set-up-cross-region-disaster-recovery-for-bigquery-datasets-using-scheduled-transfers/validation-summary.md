# Validation Summary: How to Set Up Cross-Region Disaster Recovery for BigQuery Datasets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud BigQuery
- BigQuery Data Transfer Service
- BigQuery dataset and table copy jobs
- bq command-line tool
- Python Google Cloud client libraries
- Cloud Functions-style scheduled health checks

## Sources Consulted
- BigQuery dataset creation and location documentation: https://cloud.google.com/bigquery/docs/datasets
- BigQuery dataset copy documentation: https://cloud.google.com/bigquery/docs/managing-datasets#copy-datasets
- BigQuery table copy and cross-region copy documentation: https://cloud.google.com/bigquery/docs/managing-tables#copy_tables_across_regions
- BigQuery locations documentation: https://cloud.google.com/bigquery/docs/locations
- BigQuery Data Transfer Service Python TransferConfig reference: https://cloud.google.com/python/docs/reference/bigquerydatatransfer/latest/google.cloud.bigquery_datatransfer_v1.types.TransferConfig
- BigQuery Data Transfer Service Python client reference: https://cloud.google.com/python/docs/reference/bigquerydatatransfer/latest/google.cloud.bigquery_datatransfer_v1.services.data_transfer_service.DataTransferServiceClient
- BigQuery Python CopyJob reference: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.job.CopyJob

## Issues Found
- The scheduled dataset transfer example used `every 1 hours` and described hourly replication. BigQuery dataset copy transfers have a documented minimum frequency of 12 hours, so the example now uses `every 12 hours` and the monitoring stale-run threshold was adjusted from 3 hours to 13 hours.
- The scheduled transfer helper hard-coded `europe-west1` as the transfer config location. Because the transfer config location must match the destination dataset location, the helper now accepts `destination_location`.
- The table copy example printed `job.total_bytes_processed`, which is not a documented `CopyJob` property in the current Python client. The print statement now reports the completed source-to-destination copy without referencing that query-job metric.
- The incremental replication example attempted to query from the source region and write directly to the DR dataset in another region. BigQuery requires all datasets read from and written to by a query job to be in the same location, so the example now writes a source-region staging table, copies that table across regions, then merges from a destination-region staging table.
- The incremental replication example used an overlap window with `WRITE_APPEND`, which could duplicate rows. The destination-side step now uses `MERGE` with a configurable dedupe key.
- The monitoring example imported `monitoring_v3` but did not use it, which would add an unnecessary dependency for the sample. The unused import was removed.
- The failover view-update example assumed one views dataset could be rewritten between datasets in different BigQuery locations. BigQuery views and referenced datasets must be location-compatible, so the example now uses separate primary and DR views datasets.
- The freshness validator compared `None` to an integer when a table had no records. It now treats an empty table as not fresh and returns `False`.

## Review Notes
- BigQuery dataset copying is documented as Beta, and cross-region table copying is documented as Preview. The post remains technically useful, but readers should account for Pre-GA support terms and documented limitations before using these examples for production DR.
- Dataset copy transfers do not copy all resource types, such as views, routines, UDFs, external tables, and cross-region CDC tables. The failover section correctly treats views as separate objects to manage.
