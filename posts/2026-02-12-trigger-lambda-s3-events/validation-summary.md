# Validation Summary: How to Trigger Lambda Functions from S3 Events

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon S3 Event Notifications
- AWS Lambda
- AWS CDK v2
- AWS CLI
- AWS CloudFormation
- Amazon EventBridge
- Amazon SQS and Amazon SNS
- Node.js Lambda handlers
- AWS SDK for JavaScript v3

## Sources Consulted
- AWS Lambda: Process Amazon S3 event notifications with Lambda - https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html
- Amazon S3 User Guide: Event notification types and destinations - https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-how-to-event-types-and-destinations.html
- Amazon S3 User Guide: Event message structure - https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-content-structure.html
- Amazon S3 User Guide: Configuring event notifications using object key name filtering - https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-how-to-filtering.html
- Amazon S3 User Guide: Amazon S3 Event Notifications - https://docs.aws.amazon.com/AmazonS3/latest/userguide/EventNotifications.html
- AWS Lambda Developer Guide: How Lambda handles errors and retries with asynchronous invocation - https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-error-handling.html
- AWS Lambda Developer Guide: Understanding retry behavior in Lambda - https://docs.aws.amazon.com/lambda/latest/dg/invocation-retries.html
- AWS CLI Command Reference: lambda add-permission - https://docs.aws.amazon.com/cli/latest/reference/lambda/add-permission.html
- AWS CLI Command Reference: s3api put-bucket-notification-configuration - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-notification-configuration.html
- AWS CDK v2 API Reference: aws_s3.IBucket.addEventNotification - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.IBucket.html
- AWS CloudFormation Template Reference: AWS::S3::Bucket NotificationConfiguration - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-s3-bucket-notificationconfiguration.html
- AWS CloudFormation Template Reference: AWS::S3::Bucket LambdaConfiguration - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-s3-bucket-lambdaconfiguration.html
- AWS What's New: Amazon S3 Event Notifications with Amazon EventBridge - https://aws.amazon.com/about-aws/whats-new/2021/11/amazon-s3-event-notifications-amazon-eventbridge-build-advanced-serverless-applications/

## Issues Found
- The post said S3 can send notifications to one of three targets: Lambda, SQS, or SNS. Updated this to include EventBridge, which is an official S3 event notification destination.
- The CDK example set `OUTPUT_BUCKET` to a bucket name but did not create that bucket or grant the Lambda function write access to it. Added an output bucket, used `outputBucket.bucketName` in the Lambda environment, and granted `outputBucket.grantWrite(processor)`.
- The CLI setup showed S3 invoke permission and bucket notification configuration, but the handler also requires S3 read/write permissions on the Lambda execution role. Added a short note to make that requirement explicit.
- The EventBridge section said S3 could send events to EventBridge starting in 2023. Corrected this to late 2021, when Amazon S3 Event Notifications with EventBridge launched for commercial AWS Regions.

## Review Notes
The reviewed commands, CloudFormation property names, CDK APIs, S3 event filtering syntax, URL-decoding guidance, asynchronous Lambda retry behavior, and Node.js handler pattern are consistent with official AWS documentation. For production workloads, the post could later mention idempotency and duplicate or unordered S3 notifications, but this is an enhancement rather than a correctness fix.
