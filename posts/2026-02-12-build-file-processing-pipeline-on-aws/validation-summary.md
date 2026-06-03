# Validation Summary: How to Build a File Processing Pipeline on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CDK
- Amazon S3
- AWS Lambda
- Amazon SQS
- AWS Step Functions
- Amazon SNS
- Amazon CloudWatch
- AWS SDK for JavaScript v3
- Node.js
- csv-parser

## Sources Consulted
- AWS Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda Node.js runtime support: https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- AWS Lambda timeout configuration: https://docs.aws.amazon.com/lambda/latest/dg/configuration-timeout.html
- AWS Lambda ephemeral storage announcement: https://aws.amazon.com/about-aws/whats-new/2022/03/aws-lambda-configure-ephemeral-storage/
- AWS Lambda with Amazon SQS: https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
- AWS Lambda SQS event source configuration: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html
- AWS CDK S3 notifications module: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3_notifications-readme.html
- AWS CDK Lambda Runtime API: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Runtime.html
- AWS SDK for JavaScript v3 S3 GetObjectCommand: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/GetObjectCommand/
- AWS Step Functions Inline Map state: https://docs.aws.amazon.com/step-functions/latest/dg/state-map-inline.html
- AWS Step Functions Choice state: https://docs.aws.amazon.com/step-functions/latest/dg/awl-ref-states-choice.html
- AWS Step Functions SNS integration: https://docs.aws.amazon.com/step-functions/latest/dg/sns-iam.html
- AWS Step Functions service quotas: https://docs.aws.amazon.com/step-functions/latest/dg/service-quotas.html
- Amazon S3 Select documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-select-sql-reference-select.html
- Amazon SQS long polling: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-short-and-long-polling.html

## Issues Found
- The CDK stack snippet referenced `outputBucket`, `errorBucket`, and `STATE_MACHINE_ARN` without defining them. I added output and error buckets, a `StateMachineArn` CloudFormation parameter, and the missing environment variable so the example is internally consistent.
- The processor Lambda could write failed files and start Step Functions executions, but the CDK snippet granted only S3 read access. I added write access to the error bucket and an IAM policy for `states:StartExecution`.
- The CDK snippet used `lambda.Runtime.NODEJS_18_X`. Node.js 18 is no longer a current Lambda runtime for a 2026 tutorial, so I updated it to `lambda.Runtime.NODEJS_24_X`.
- The CDK snippet later used `cloudwatch.Alarm` but did not import CloudWatch. I added the missing import to the stack snippet.
- The Step Functions `Map` state used the deprecated `Iterator` field. I changed it to `ItemProcessor` with `ProcessorConfig.Mode` set to `INLINE`.
- The large-file example recommended S3 Select. AWS documentation says Amazon S3 Select is no longer available to new customers, so I replaced that example with a streaming row-range splitter based on `GetObjectCommand` and `csv-parser`.
- The processor Lambda passed every validated CSV row into the Step Functions execution input. Step Functions has a 256 KiB input/output quota, so I changed the example to pass only the source S3 reference and row count.

## Review Notes
- The architecture and service responsibilities are broadly correct: S3 can send object-created notifications to SQS, Lambda can poll SQS through an event source mapping, Step Functions can orchestrate downstream work, and SNS publishing from Step Functions is a supported service integration.
- The example remains illustrative. For production, storing validation reports and chunk manifests in S3 and passing references between states would scale better than keeping detailed per-row metadata in workflow state.
