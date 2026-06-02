# Validation Summary: How to Set Up Timestream Scheduled Queries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Timestream for LiveAnalytics
- Timestream scheduled queries
- AWS CLI
- Amazon SNS
- Amazon S3
- AWS IAM
- Timestream SQL

## Sources Consulted
- AWS CLI Command Reference: create-scheduled-query: https://docs.aws.amazon.com/cli/latest/reference/timestream-query/create-scheduled-query.html
- AWS CLI Command Reference: update-scheduled-query: https://docs.aws.amazon.com/cli/latest/reference/timestream-query/update-scheduled-query.html
- Amazon Timestream Developer Guide: Scheduled queries: https://docs.aws.amazon.com/timestream/latest/developerguide/scheduled-query.html
- Amazon Timestream Developer Guide: Scheduled query concepts: https://docs.aws.amazon.com/timestream/latest/developerguide/scheduledqueries-concepts.html
- Amazon Timestream Developer Guide: Schedule expressions for scheduled queries: https://docs.aws.amazon.com/timestream/latest/developerguide/scheduledqueries-schedule.html
- Amazon Timestream Developer Guide: Data model mappings for scheduled queries: https://docs.aws.amazon.com/timestream/latest/developerguide/scheduledqueries-mappings.html
- Amazon Timestream Developer Guide: Identity-based policy examples: https://docs.aws.amazon.com/timestream/latest/developerguide/security_iam_id-based-policy-examples.html
- Amazon Timestream Developer Guide: Simple queries: https://docs.aws.amazon.com/timestream/latest/developerguide/sample-queries.basic-scenarios.html
- Amazon Timestream API Reference: ExecuteScheduledQuery: https://docs.aws.amazon.com/timestream/latest/developerguide/API_query_ExecuteScheduledQuery.html

## Issues Found
- The prerequisites only created `hourly_metrics`, but later examples write to `rolling_stats` and `anomalies`. Added create-table commands for both target tables so all scheduled query examples have destination tables.
- The scheduled query commands configured S3 error reporting to `my-timestream-errors`, but the prerequisites did not create that bucket. Added an S3 bucket creation step for the error report destination.
- The IAM execution role policy omitted `timestream:SelectValues`, which AWS includes in scheduled query/query execution permissions for value-only query operations. Added `timestream:SelectValues` to the Timestream permissions list.
- The post said scheduled queries cannot be modified in place. AWS provides `update-scheduled-query`, but it updates the scheduled query state rather than changing the query definition. Updated the section to explain that enable/disable can be done in place, while query text, schedule, target, notification, and error report changes require delete/recreate.

## Review Notes
The AWS CLI was not installed in the local workspace, so command validation was performed against official AWS CLI and Timestream documentation rather than local `aws --help` output. The post uses placeholder AWS account IDs, ARNs, bucket names, and example table/schema names; readers must substitute real values before running the commands.
