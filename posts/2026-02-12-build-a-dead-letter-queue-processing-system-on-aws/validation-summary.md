# Validation Summary: How to Build a Dead Letter Queue Processing System on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon SQS
- SQS dead-letter queues and redrive
- AWS Lambda
- Lambda SQS event source mappings
- CloudFormation
- Amazon CloudWatch alarms and metrics
- Amazon SNS
- Amazon S3
- Amazon DynamoDB
- Python and boto3

## Sources Consulted
- AWS CloudFormation `AWS::SQS::Queue` documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-sqs-queue.html
- Amazon SQS dead-letter queue retention documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/setting-up-dead-letter-queue-retention.html
- AWS Lambda SQS event source mapping configuration documentation: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html
- AWS Lambda SQS partial batch response documentation: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html
- AWS CloudFormation `AWS::Lambda::EventSourceMapping` documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-eventsourcemapping.html
- Amazon SQS CloudWatch metrics documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html
- boto3 SQS `send_message` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/sqs/client/send_message.html
- boto3 SQS `start_message_move_task` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/sqs/client/start_message_move_task.html
- Amazon DynamoDB Scan documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Scan.html

## Issues Found
- The description said the system used Step Functions, but the post did not include Step Functions. Removed Step Functions from the description.
- The architecture and text implied that SQS would automatically move messages from a delayed retry queue back to the source queue. Updated the diagram and explanation to state that the retry queue must be consumed by the same application processor.
- The source queue and DLQ both used a 14-day retention period. AWS recommends setting a standard DLQ retention period longer than the source queue retention period because the original enqueue timestamp is retained. Changed the source queue retention to 4 days while keeping the DLQ at 14 days.
- The explanation of `maxReceiveCount` said messages move after exactly 3 failed attempts. AWS documents the move as happening when the receive count exceeds `maxReceiveCount`; updated the wording and comment.
- The DLQ growth alarm used `NumberOfMessagesSent`, but AWS documents that this metric does not include messages automatically moved to a DLQ by a redrive policy. Changed the example to alarm on `ApproximateNumberOfMessagesVisible`.
- The redrive section described SQS's built-in redrive feature but used a manual receive/send/delete loop. Replaced it with `start_message_move_task`, the boto3 API for SQS-managed DLQ redrive.
- The DynamoDB analytics scan read only the first scan page. Added `LastEvaluatedKey` pagination so the example can process all matching pages.
- The conclusion recommended exponential backoff, but the examples use delayed retries. Updated the wording to "delayed retries."
- The conclusion said the implementation works for SQS, SNS, Kinesis, and EventBridge. Narrowed the claim to say the concepts can be adapted because implementation details differ by service.

## Review Notes
The examples are still illustrative rather than a complete deployable stack: they assume supporting resources such as the Lambda function, IAM permissions, DynamoDB tables, S3 bucket, SNS topics, and manual review queue exist. Python code blocks were checked for syntax with Python 3.
