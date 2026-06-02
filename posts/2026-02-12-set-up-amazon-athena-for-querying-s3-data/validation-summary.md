# Validation Summary: How to Set Up Amazon Athena for Querying S3 Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Athena
- Amazon S3
- AWS Glue Data Catalog
- AWS CLI
- SQL / Hive DDL
- Python boto3 SDK
- Amazon CloudWatch metrics

## Sources Consulted
- Amazon Athena User Guide: Specify a query result location using a workgroup - https://docs.aws.amazon.com/athena/latest/ug/query-results-specify-location-workgroup.html
- AWS CLI Command Reference: athena update-work-group - https://docs.aws.amazon.com/cli/latest/reference/athena/update-work-group.html
- AWS CLI Command Reference: athena create-work-group - https://docs.aws.amazon.com/cli/latest/reference/athena/create-work-group.html
- Amazon Athena User Guide: CREATE TABLE - https://docs.aws.amazon.com/athena/latest/ug/create-table.html
- Amazon Athena User Guide: OpenX JSON SerDe - https://docs.aws.amazon.com/athena/latest/ug/openx-json-serde.html
- Amazon Athena User Guide: Parquet SerDe - https://docs.aws.amazon.com/athena/latest/ug/parquet-serde.html
- Amazon Athena API Reference: StartQueryExecution - https://docs.aws.amazon.com/athena/latest/APIReference/API_StartQueryExecution.html
- Boto3 Athena Client: start_query_execution - https://docs.aws.amazon.com/boto3/latest/reference/services/athena/client/start_query_execution.html
- Boto3 Athena Client: get_query_execution - https://docs.aws.amazon.com/boto3/latest/reference/services/athena/client/get_query_execution.html
- Boto3 Athena Client: get_query_results - https://docs.aws.amazon.com/boto3/latest/reference/services/athena/client/get_query_results.html
- Amazon Athena User Guide: Monitor Athena query metrics with CloudWatch - https://docs.aws.amazon.com/athena/latest/ug/query-metrics-viewing.html
- Amazon Athena User Guide: Use compression in Athena - https://docs.aws.amazon.com/athena/latest/ug/compression-formats.html
- Amazon Athena Pricing - https://aws.amazon.com/athena/pricing/
- Amazon Athena User Guide: Athena engine version 3 - https://docs.aws.amazon.com/athena/latest/ug/engine-versions-reference-0003.html

## Issues Found
- The `aws athena update-work-group` command used `--configuration` with `ResultConfiguration`, which is the create-work-group configuration shape. Updated it to `--configuration-updates` with `ResultConfigurationUpdates`, matching the current AWS CLI update-work-group command.
- The Parquet table comment said "automatic schema detection" even though the DDL explicitly defines the schema. Updated the comment to avoid implying automatic inference.
- The CloudWatch metrics list included `DataScannedInBytes`, which is an Athena query execution statistic returned by APIs such as `GetQueryExecution`, not a CloudWatch metric name. Replaced it with the documented CloudWatch metrics `ProcessedBytes` and `EngineExecutionTime`.

## Review Notes
- The examples assume the S3 buckets are globally unique and that the caller has the required Athena, Glue Data Catalog, and S3 permissions.
- The Python `get_query_results` example reads only the first page of results; production code should use the paginator for larger result sets.
- CloudWatch query metrics are available per workgroup when CloudWatch metrics publishing is enabled for Athena.
