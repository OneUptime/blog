# Validation Summary: How to Subscribe an SQS Queue to SNS (Fan-Out Pattern)

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Amazon SNS
- Amazon SQS
- AWS CLI
- Python
- boto3
- AWS CDK v2
- IAM resource policies
- SNS subscription filter policies
- SQS dead letter queues

## Sources Consulted
- Amazon SNS Developer Guide: Subscribing an Amazon SQS queue to an Amazon SNS topic: https://docs.aws.amazon.com/sns/latest/dg/subscribe-sqs-queue-to-sns-topic.html
- AWS CLI Command Reference: `aws sns subscribe`: https://docs.aws.amazon.com/cli/latest/reference/sns/subscribe.html
- AWS CLI Command Reference: `aws sns set-subscription-attributes`: https://docs.aws.amazon.com/cli/latest/reference/sns/set-subscription-attributes.html
- AWS CLI Command Reference: `aws sqs create-queue`: https://docs.aws.amazon.com/cli/latest/reference/sqs/create-queue.html
- AWS CLI Command Reference: `aws sqs get-queue-attributes`: https://docs.aws.amazon.com/cli/latest/reference/sqs/get-queue-attributes.html
- AWS CLI Command Reference: `aws sqs set-queue-attributes`: https://awscli.amazonaws.com/v2/documentation/api/2.34.7/reference/sqs/set-queue-attributes.html
- boto3 SNS `subscribe` client documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/sns/client/subscribe.html
- boto3 SQS receive message documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/sqs/queue/receive_messages.html
- AWS CDK v2 `SqsSubscriptionProps` documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns_subscriptions.SqsSubscriptionProps.html
- AWS CDK v2 `SubscriptionFilter` documentation: https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_sns/SubscriptionFilter.html
- Amazon SNS raw message delivery documentation: https://docs.aws.amazon.com/sns/latest/dg/large-payload-raw-message.html
- Amazon SNS message attributes documentation: https://docs.aws.amazon.com/sns/latest/dg/sns-message-attributes.html
- Amazon SNS message filtering documentation: https://docs.aws.amazon.com/sns/latest/dg/sns-message-filtering.html

## Issues Found
No technical issues found.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI command validation was performed against the official AWS CLI command reference. The Python examples were parsed successfully with Python's AST parser. The CDK example matches the documented CDK v2 APIs, but the repository does not include `aws-cdk-lib`, so it was reviewed against official CDK documentation rather than compiled locally.

The filter policy examples correctly use `FilterPolicyScope: MessageAttributes`, which means publishers must include an `event_type` SNS message attribute for those filtered subscriptions to receive messages. Raw message delivery is correctly described; as a future improvement, the post could mention AWS's documented limit that SQS subscriptions with raw delivery enabled can receive at most 10 SNS message attributes.
