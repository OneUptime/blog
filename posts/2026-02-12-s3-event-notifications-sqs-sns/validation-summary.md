# Validation Summary: How to Set Up S3 Event Notifications to SQS and SNS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon S3 event notifications
- Amazon SQS
- Amazon SNS
- AWS Lambda event source mappings and SNS triggers
- Amazon EventBridge
- AWS CLI
- Python with boto3

## Sources Consulted
- Amazon S3 User Guide: Event notification types and destinations: https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-how-to-event-types-and-destinations.html
- Amazon S3 User Guide: Granting permissions to publish event notification messages to a destination: https://docs.aws.amazon.com/AmazonS3/latest/userguide/grant-destinations-permissions-to-s3.html
- Amazon S3 User Guide: Event message structure: https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-content-structure.html
- AWS CLI Command Reference: put-bucket-notification-configuration: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-notification-configuration.html
- AWS CLI Command Reference: set-queue-attributes: https://docs.aws.amazon.com/cli/latest/reference/sqs/set-queue-attributes.html
- AWS Lambda Developer Guide: Invoking Lambda functions with Amazon SNS notifications: https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html
- Amazon SNS Developer Guide: Sending SNS messages to Amazon SQS queues: https://docs.aws.amazon.com/sns/latest/dg/sns-sqs-as-subscriber.html
- Amazon EventBridge User Guide: Comparison operators for event patterns: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-pattern-operators.html
- Boto3 documentation: SQS receive_message: https://docs.aws.amazon.com/boto3/latest/reference/services/sqs/client/receive_message.html

## Issues Found
- The SQS consumer used the S3 object key from the event payload directly. S3 notification object keys are URL-encoded, so keys containing spaces or special characters could fail when passed to `get_object`. Updated the Python example to decode the key with `urllib.parse.unquote_plus`.
- The S3 notification configuration commands did not mention that `put-bucket-notification-configuration` replaces the bucket's existing notification configuration. Added comments to the standalone SQS and SNS configuration examples to prevent readers from accidentally deleting existing notification targets.
- The SNS fan-out subscription example omitted the resource-based permissions needed for SNS to invoke a Lambda function and send messages to an SQS queue. Added `aws lambda add-permission` and an SQS queue policy update before the relevant subscriptions.
- The combined SQS, SNS, and Lambda example could fail if destination resource policies were not already configured. Added a short note that each destination policy must allow S3 to publish or invoke before applying the multi-target configuration.

## Review Notes
- The AWS CLI commands could not be tested against a local AWS CLI installation because `aws` is not installed in this environment. Command names, flags, JSON field names, and behavior were checked against official AWS documentation instead.
- S3 event notification destinations must be in the same AWS Region as the bucket, and S3 supports standard SNS topics and standard SQS queues as direct notification destinations, not FIFO topics or FIFO queues. The examples use standard names and ARNs, so they are consistent with that requirement.
- For production use, destination policies should usually include both `aws:SourceArn` and `aws:SourceAccount` conditions to reduce confused-deputy risk.
