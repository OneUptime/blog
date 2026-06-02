# Validation Summary: How to Fix SQS Messages Not Being Processed by Lambda

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Amazon SQS
- AWS Lambda
- Lambda event source mappings
- AWS IAM
- AWS KMS
- Amazon CloudWatch
- AWS CLI
- Python Lambda handlers

## Sources Consulted
- AWS Lambda Developer Guide: Creating and configuring an Amazon SQS event source mapping - https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html
- AWS Lambda Developer Guide: Using Lambda with Amazon SQS - https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
- AWS Lambda Developer Guide: Handling errors for an SQS event source in Lambda - https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html
- AWS Lambda Developer Guide: Lambda parameters for Amazon SQS event source mappings - https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-parameters.html
- AWS managed policy reference: AWSLambdaSQSQueueExecutionRole - https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaSQSQueueExecutionRole.html
- AWS CLI Command Reference: lambda create-event-source-mapping - https://docs.aws.amazon.com/cli/latest/reference/lambda/create-event-source-mapping.html
- AWS CLI Command Reference: lambda update-event-source-mapping - https://docs.aws.amazon.com/cli/latest/reference/lambda/update-event-source-mapping.html
- Amazon SQS Developer Guide: Using dead-letter queues in Amazon SQS - https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
- AWS CLI Command Reference: sqs set-queue-attributes - https://docs.aws.amazon.com/cli/latest/reference/sqs/set-queue-attributes.html
- AWS CLI Command Reference: cloudwatch put-metric-alarm - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html

## Issues Found
- The IAM policy example omitted `sqs:ChangeMessageVisibility`, which is included in the AWS managed policy for Lambda SQS queue execution and is needed by Lambda's SQS poller. Added the permission and updated the explanatory text from three actions to four actions.
- The visibility timeout guidance said to use exactly 6x the Lambda timeout. AWS recommends 6x the Lambda timeout plus `MaximumBatchingWindowInSeconds` when a batch window is configured, and the post's event source mapping example configures a 5-second batch window. Updated the text and example value from 360 seconds to 365 seconds.
- The DLQ explanation said `maxReceiveCount` of 3 sends a message to the DLQ after 3 failed attempts. SQS redrive behavior is based on the receive count exceeding `maxReceiveCount`, so the wording was updated accordingly.
- The partial batch response section did not mention the FIFO-specific requirement to stop processing after the first failed message and report failed plus unprocessed messages. Added a concise note to preserve FIFO ordering.

## Review Notes
The AWS CLI commands and Python response shape are current and align with AWS documentation. The `date -d` example uses GNU `date`, so it is suitable for typical Linux shells but may need adjustment on macOS.
