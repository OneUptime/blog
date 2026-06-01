# Validation Summary: How to Use QuickSight with Athena

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon QuickSight
- Amazon Athena
- Amazon S3
- AWS Glue Data Catalog
- AWS IAM
- Amazon CloudWatch
- AWS CLI
- Athena SQL / CTAS
- SPICE datasets and refresh schedules

## Sources Consulted
- AWS CLI Command Reference: Athena `create-work-group` - https://docs.aws.amazon.com/cli/latest/reference/athena/create-work-group.html
- Amazon Athena User Guide: CTAS table properties - https://docs.aws.amazon.com/athena/latest/ug/create-table-as.html
- Amazon Athena User Guide: CTAS examples - https://docs.aws.amazon.com/athena/latest/ug/ctas-examples.html
- Amazon Athena User Guide: Partitioning - https://docs.aws.amazon.com/athena/latest/ug/ctas-partitioning-and-bucketing-what-is-partitioning.html
- Amazon Athena User Guide: CloudWatch query metrics - https://docs.aws.amazon.com/athena/latest/ug/query-metrics-viewing.html
- AWS CLI Command Reference: Athena `get-query-execution` - https://docs.aws.amazon.com/cli/latest/reference/athena/get-query-execution.html
- AWS CLI Command Reference: QuickSight `create-data-source` - https://docs.aws.amazon.com/cli/latest/reference/quicksight/create-data-source.html
- AWS CLI Command Reference: QuickSight `create-data-set` - https://docs.aws.amazon.com/cli/latest/reference/quicksight/create-data-set.html
- Amazon QuickSight API Reference: `CreateDataSet` - https://docs.aws.amazon.com/quicksight/latest/APIReference/API_CreateDataSet.html
- Amazon QuickSight API Reference: `CreateRefreshSchedule` - https://docs.aws.amazon.com/quicksight/latest/APIReference/API_CreateRefreshSchedule.html
- Amazon QuickSight User Guide: Authorizing Athena connections - https://docs.aws.amazon.com/quick/latest/userguide/athena.html
- Amazon Athena pricing - https://aws.amazon.com/athena/pricing/

## Issues Found
- The QuickSight service role example used `aws-quicksight-service-role-v0` as the primary role name. AWS documentation lists `aws-quicksight-s3-consumers-role-v0` as the default role for Athena and S3, with `aws-quicksight-service-role-v0` as a fallback for older accounts. Updated the text and command.
- The Athena IAM example omitted several catalog, metadata, list, and streaming actions that AWS documents for QuickSight Athena authorization. Added the missing Athena permissions as a separate metadata/list statement while keeping query execution scoped to the example workgroup.
- The dataset example used `--logical-table-map`, which the current QuickSight `CreateDataSet` API marks as deprecated. Moved the simple calculated fields into the Athena custom SQL query and removed the deprecated logical table transform block.
- The CTAS example specified `external_location` after creating an Athena workgroup with `EnforceWorkGroupConfiguration` set to `true`. Athena documentation says CTAS queries that specify `external_location` fail in workgroups that enforce a query results location. Removed the `external_location` property from that example.
- The cost monitoring section referred to a CloudWatch metric named `DataScannedInBytes`. That is a field in `GetQueryExecution` statistics, but the CloudWatch metric for bytes scanned is `ProcessedBytes`. Updated the CloudWatch metric name.

## Review Notes
- The refresh schedule examples omit `Timezone`; the API allows this, but production examples should specify a timezone to make scheduled refresh timing explicit.
- The IAM policy is intentionally scoped to example buckets and one Athena workgroup. Real deployments may also need Lake Formation, KMS, or Athena federated query permissions depending on the environment.
