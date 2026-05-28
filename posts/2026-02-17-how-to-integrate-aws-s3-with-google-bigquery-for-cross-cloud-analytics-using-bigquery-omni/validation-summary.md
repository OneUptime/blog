# Validation Summary: How to Integrate AWS S3 with Google BigQuery for Cross-Cloud Analytics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google BigQuery
- BigQuery Omni
- BigLake external tables
- Amazon S3
- AWS IAM
- AWS CloudFormation
- GoogleSQL
- BigQuery INFORMATION_SCHEMA

## Sources Consulted
- Google Cloud documentation: Connect to Amazon S3 with BigQuery Omni: https://docs.cloud.google.com/bigquery/docs/omni-aws-create-connection
- Google Cloud documentation: External tables for Amazon S3: https://docs.cloud.google.com/bigquery/docs/omni-aws-create-external-table
- Google Cloud documentation: Introduction to BigQuery Omni: https://cloud.google.com/bigquery/docs/omni-introduction
- Google Cloud documentation: BigQuery Omni pricing: https://cloud.google.com/bigquery/pricing
- Google Cloud documentation: BigQuery INFORMATION_SCHEMA JOBS view: https://cloud.google.com/bigquery/docs/information-schema-jobs
- Google Cloud documentation: Create materialized views: https://docs.cloud.google.com/bigquery/docs/materialized-views-create
- Google Cloud documentation: Load data with cross-cloud operations: https://docs.cloud.google.com/bigquery/docs/load-data-using-cross-cloud-transfer
- AWS CloudFormation documentation: AWS::IAM::Role: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-iam-role.html

## Issues Found
- The BigQuery connection creation command used a `--properties` payload with `crossCloudProperties.serviceAccountId`, which is not the documented `bq` flow for AWS connections. Changed it to use `--iam_role_id`.
- The post described the connection identity as an AWS identity ARN. BigQuery returns a Google identity for the AWS trust policy, so the wording was corrected.
- The post showed updating the AWS role on the BigQuery connection with an unsupported `bq update --properties` shape for this workflow. Replaced that section with a connection verification command.
- The Hive-partitioned external table example omitted `WITH PARTITION COLUMNS`, which is required in the documented SQL form. Added partition columns for `dt` and `region`.
- The pre-aggregation example used invalid `CREATE TABLE ... WITH CONNECTION ... OPTIONS ... AS SELECT` syntax for creating an S3-backed summary table. Replaced it with a materialized view over a metadata cache-enabled BigLake table.
- The materialized view example used `COUNT(DISTINCT user_id)`, which is not supported in BigQuery materialized view definitions. Replaced it with `APPROX_COUNT_DISTINCT(user_id)`.
- The base S3 external table did not enable metadata caching, which is required for materialized views over BigLake tables. Added `max_staleness` and `metadata_cache_mode` options.
- The pricing section implied all query data transfer was free and that cross-cloud result transfers use standard egress charges. Updated the wording to distinguish on-demand query pricing, reservations, and additional transfer charges for cross-cloud operations that move data from AWS to Google Cloud.
- The INFORMATION_SCHEMA query used an invalid project and region qualifier. Changed it to use the region-qualified `region-aws-us-east-1`.INFORMATION_SCHEMA.JOBS form and added a note about running from the colocated BigQuery region.

## Review Notes
The post is technically relevant and remains a useful tutorial after the corrections. The setup flow still assumes the reader has or can create the named AWS role ARN used by the connection command; in a production guide, this could be expanded with a clearer two-pass role trust policy workflow, but the corrected commands and policy fields now align with the official documentation.
