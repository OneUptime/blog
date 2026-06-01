# Validation Summary: How to Use Lambda to Process Files from S3

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- Amazon S3 event notifications
- AWS IAM
- AWS CLI
- AWS CloudFormation
- AWS SDK for JavaScript v3
- Node.js streams
- csv-parse
- Amazon DynamoDB

## Sources Consulted
- Amazon S3 event notification types and destinations: https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-how-to-event-types-and-destinations.html
- AWS CLI `lambda put-function-event-invoke-config`: https://docs.aws.amazon.com/cli/latest/reference/lambda/put-function-event-invoke-config.html
- AWS CLI `s3api put-bucket-notification-configuration`: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-notification-configuration.html
- AWS CloudFormation `AWS::S3::Bucket NotificationConfiguration`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-s3-bucket-notificationconfiguration.html
- AWS CloudFormation `AWS::S3::Bucket LambdaConfiguration`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-s3-bucket-lambdaconfiguration.html
- AWS CloudFormation `AWS::Lambda::Permission`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-permission.html
- AWS Lambda asynchronous invocation error handling: https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-error-handling.html
- AWS Lambda quotas: https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- AWS Lambda ephemeral storage: https://docs.aws.amazon.com/lambda/latest/dg/configuration-ephemeral-storage.html
- AWS SDK for JavaScript v3 S3 `GetObjectCommand`: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/GetObjectCommand/
- AWS SDK for JavaScript v3 DynamoDB `BatchWriteItemCommand`: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-dynamodb/Class/BatchWriteItemCommand/
- CSV Parse stream API: https://csv.js.org/parse/api/stream/
- Node.js stream documentation: https://nodejs.org/api/stream.html

## Issues Found
- The CloudFormation example could try to apply the S3 notification before Lambda invoke permission existed. Updated the bucket with `DependsOn: S3InvokePermission`, changed the permission `SourceArn` to the literal bucket ARN to avoid a dependency cycle, and added `SourceAccount`.
- The streaming CSV example referenced undefined helper functions and did not include the DynamoDB client or batch write logic. Added `extractS3Info`, `writeBatch`, `BatchWriteItemCommand`, and handling for DynamoDB `UnprocessedItems`.
- The IAM policy only allowed `dynamodb:PutItem`, but the streaming example now uses `dynamodb:BatchWriteItem`. Added `dynamodb:BatchWriteItem`.
- The streaming transform used async work without passing errors to the stream callback. Wrapped `transform` and `flush` bodies in `try`/`catch` and call `callback(error)` on failures.
- The error handling section described the `put-function-event-invoke-config --destination-config` example as a dead letter queue. Updated the wording to call it an on-failure destination and clarified that Lambda discards failed asynchronous events after retries unless a DLQ or destination is configured.

## Review Notes
- The JavaScript snippets were syntax-checked with `node --check`.
- The AWS CLI was not installed in the workspace, so CLI command validation was performed against the official AWS CLI documentation.
- The DynamoDB batch write retry loop resubmits `UnprocessedItems`; production code should usually add exponential backoff around those retries.
