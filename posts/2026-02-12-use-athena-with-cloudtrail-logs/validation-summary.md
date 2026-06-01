# Validation Summary: How to Use Athena with CloudTrail Logs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudTrail
- Amazon Athena
- Amazon S3
- Athena partition projection
- Hive JSON SerDe
- Python
- Boto3
- Amazon EventBridge

## Sources Consulted
- AWS CloudTrail: Getting and viewing your CloudTrail log files - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/get-and-view-cloudtrail-log-files.html
- Amazon Athena: Understand CloudTrail logs and Athena tables - https://docs.aws.amazon.com/athena/latest/ug/create-cloudtrail-table-understanding.html
- Amazon Athena: Create the table for CloudTrail logs in Athena using partition projection - https://docs.aws.amazon.com/athena/latest/ug/create-cloudtrail-table-partition-projection.html
- Amazon Athena: Use partition projection with Amazon Athena - https://docs.aws.amazon.com/athena/latest/ug/partition-projection.html
- Amazon Athena: Supported types for partition projection - https://docs.aws.amazon.com/athena/latest/ug/partition-projection-supported-types.html
- AWS CloudTrail: AWS Management Console sign-in events - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-event-reference-aws-console-sign-in-events.html
- AWS CloudTrail: CloudTrail concepts, global service events - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-concepts.html
- Boto3: Athena client start_query_execution - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/athena/client/start_query_execution.html
- AWS Lambda: Invoke a Lambda function on a schedule with EventBridge Scheduler - https://docs.aws.amazon.com/lambda/latest/dg/with-eventbridge-scheduler.html

## Issues Found
- The opening claim said every API call is recorded by CloudTrail. Updated it to clarify that management events are logged by default, while data events and network activity events require configuration.
- The post described CloudTrail logs as JSON files containing an array of events. Updated this to the documented gzip-compressed JSON log format with a top-level `Records` array.
- The sample JSON used ellipses inside a `json` code block, which made the snippet invalid JSON. Replaced the placeholders with valid example values.
- The Athena `CREATE EXTERNAL TABLE` example omitted the documented CloudTrail input format and output format. Added `com.amazon.emr.cloudtrail.CloudTrailInputFormat` and `HiveIgnoreKeyTextOutputFormat` so Athena can read records from CloudTrail log files correctly.
- The console login query filtered only `us-east-1`, but AWS documents that `ConsoleLogin` events can be recorded in other sign-in regions depending on sign-in type and endpoint behavior. Updated the query and note to include the relevant sign-in regions.
- The Python automation example calculated `yesterday` from the previous day but used the current month and year, which breaks across month and year boundaries. Updated it to derive day, month, and year from the same UTC `yesterday_date`.
- The Python snippet initialized SNS and claimed to send results, but it only started the Athena query. Removed the unused SNS client and adjusted comments to match what the code actually does.
- Updated the scheduling reference from CloudWatch Events to EventBridge schedule.

## Review Notes
- The post's internal OneUptime links were checked and returned HTTP 200.
- The sample table schema does not expose every newer CloudTrail field, but Athena can still query the fields used by the article. Future revisions could expand the schema if the post adds queries for newer fields such as TLS details, event category, or VPC endpoint account ID.
