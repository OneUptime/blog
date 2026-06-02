# Validation Summary: How to Query CloudTrail Logs with Athena

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Athena
- AWS CloudTrail
- Amazon S3
- Athena SQL / Hive DDL
- Athena partition projection
- Parquet CTAS queries
- AWS Lambda with Boto3
- Amazon EventBridge

## Sources Consulted
- Amazon Athena User Guide: Create a table for CloudTrail logs in Athena using manual partitioning - https://docs.aws.amazon.com/athena/latest/ug/create-cloudtrail-table.html
- Amazon Athena User Guide: Use the CloudTrail console to create an Athena table for CloudTrail logs - https://docs.aws.amazon.com/athena/latest/ug/create-cloudtrail-table-ct.html
- Amazon Athena User Guide: Create the table for CloudTrail logs in Athena using partition projection - https://docs.aws.amazon.com/athena/latest/ug/create-cloudtrail-table-partition-projection.html
- Amazon Athena User Guide: Use partition projection with Amazon Athena - https://docs.aws.amazon.com/athena/latest/ug/partition-projection.html
- Amazon Athena User Guide: Set up partition projection - https://docs.aws.amazon.com/athena/latest/ug/partition-projection-setting-up.html
- Amazon Athena User Guide: CREATE TABLE AS - https://docs.aws.amazon.com/athena/latest/ug/create-table-as.html
- Amazon Athena pricing - https://aws.amazon.com/athena/pricing/
- AWS CloudTrail User Guide: Getting and viewing your CloudTrail log files - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/get-and-view-cloudtrail-log-files.html
- AWS CloudTrail User Guide: AWS Management Console sign-in events - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-event-reference-aws-console-sign-in-events.html
- Boto3 Athena client reference: start_query_execution - https://docs.aws.amazon.com/boto3/latest/reference/services/athena/client/start_query_execution.html

## Issues Found
- The CloudTrail console table-creation section implied the console shortcut worked generally. Updated it to clarify that AWS creates a non-partitioned table for regular account trails through the CloudTrail console, and that organization trail logs need manual table creation for the correct storage location.
- The "full table definition" was missing newer CloudTrail fields documented by AWS, including `onBehalfOf`, the structured `webIdFederationData` shape, `vpcEndpointAccountId`, `eventCategory`, `addendum`, `sessionCredentialFromConsole`, and `edgeDeviceDetails`. Added those fields to the manual schema.
- The partition projection `storage.location.template` did not end with a slash. Added the trailing slash, matching Athena's documented requirement for custom projected partition location templates.
- The cost optimization tips implied partition pruning from any date condition and column savings for all formats. Updated the wording to clarify that partition skipping depends on filtering partition columns and that selecting fewer columns is especially useful with columnar formats like Parquet.

## Review Notes
The remaining query examples are syntactically plausible for Athena and match CloudTrail's documented event fields. For production use, readers should adjust partition ranges, account lists, regions, S3 locations, and Athena workgroup result settings for their own environment.
