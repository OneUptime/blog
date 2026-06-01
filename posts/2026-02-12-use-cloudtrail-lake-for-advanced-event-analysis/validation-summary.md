# Validation Summary: How to Use CloudTrail Lake for Advanced Event Analysis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CloudTrail
- AWS CloudTrail Lake
- AWS CLI v2
- CloudTrail Lake SQL
- Trino SQL functions
- AWS Lambda with boto3
- Amazon EventBridge
- Amazon S3 and Amazon Athena

## Sources Consulted
- AWS CloudTrail User Guide: CloudTrail concepts and CloudTrail Lake event data stores: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-concepts.html
- AWS CloudTrail User Guide: CloudTrail Lake SQL constraints: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/query-limitations.html
- AWS CloudTrail User Guide: Create an event data store with the AWS CLI: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/lake-cli-create-eds.html
- AWS CloudTrail User Guide: Run and manage CloudTrail Lake queries with the AWS CLI: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/lake-queries-cli.html
- AWS CloudTrail User Guide: Create or edit a query with the CloudTrail console: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/query-create-edit-query.html
- AWS CloudTrail User Guide: Managing CloudTrail Lake costs: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-lake-manage-costs.html
- AWS CLI Command Reference: cloudtrail create-event-data-store: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/create-event-data-store.html
- AWS CLI Command Reference: cloudtrail update-event-data-store: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/update-event-data-store.html
- AWS CLI Command Reference: cloudtrail start-query: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/start-query.html
- AWS CLI Command Reference: cloudtrail describe-query: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/describe-query.html
- AWS CLI Command Reference: cloudtrail get-query-results: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/get-query-results.html
- Trino documentation: Date and time functions and operators: https://trino.io/docs/current/functions/datetime.html

## Issues Found
- CloudTrail activity logging was described too broadly as recording every API call. Updated the wording to supported API activity and supported services.
- CloudTrail Lake availability changed after the post date. Added the current AWS note that, as of June 1, 2026, CloudTrail Lake is available only to existing customers who signed up before May 31, 2026.
- Retention limits were outdated. Updated the post from a 7-year-only limit to the current 10-year maximum for the one-year extendable retention pricing option, with billing-mode caveats.
- The prerequisites implied that a trail or generic CloudTrail enablement was required. Updated this to require existing CloudTrail Lake access.
- The saved-query CLI example used `aws cloudtrail create-saved-query`, which is not an AWS CLI CloudTrail command. Replaced it with the documented console workflow and noted that saved queries are browser-tied.
- The scheduled-query example used `DATEADD(DAY, -1, CURRENT_TIMESTAMP)`, which is not Trino syntax. Updated it to `date_add('day', -1, current_timestamp)`.
- The cost model omitted extended retention storage behavior and described scanning imprecisely. Updated the cost section to reflect ingestion, storage for extended retention, and query scanning of optimized and compressed data.

## Review Notes
The local environment did not have the AWS CLI installed, so CLI validation was performed against the current official AWS CLI command reference and AWS CloudTrail documentation. The sample event data store identifier `abc123_event_data_store` remains a placeholder; readers must replace it with their actual CloudTrail Lake event data store ID.
