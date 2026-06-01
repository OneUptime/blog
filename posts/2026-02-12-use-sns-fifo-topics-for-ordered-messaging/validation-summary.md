# Validation Summary: How to Use SNS FIFO Topics for Ordered Messaging

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon SNS FIFO topics
- Amazon SQS FIFO queues
- AWS CLI
- AWS CDK v2
- Python
- boto3

## Sources Consulted
- Amazon SNS FIFO message ordering documentation: https://docs.aws.amazon.com/sns/latest/dg/fifo-topic-message-ordering.html
- Amazon SNS FIFO message deduplication documentation: https://docs.aws.amazon.com/sns/latest/dg/fifo-message-dedup.html
- Amazon SNS FIFO high-throughput documentation: https://docs.aws.amazon.com/sns/latest/dg/fifo-high-throughput.html
- AWS CLI `sns create-topic` command reference: https://docs.aws.amazon.com/cli/latest/reference/sns/create-topic.html
- AWS CLI `sns publish` command reference: https://docs.aws.amazon.com/cli/latest/reference/sns/publish.html
- AWS CLI `sns subscribe` command reference: https://docs.aws.amazon.com/cli/latest/reference/sns/subscribe.html
- Amazon SQS FIFO queue delivery logic documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-understanding-logic.html
- AWS CDK v2 `aws_sns.Topic` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns.Topic.html
- AWS CDK v2 `aws_sqs.Queue` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sqs.Queue.html
- AWS CDK v2 `SqsSubscriptionProps` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns_subscriptions.SqsSubscriptionProps.html
- Linked OneUptime SNS topic post: https://oneuptime.com/blog/post/2026-02-12-create-an-sns-topic/view
- Linked OneUptime SQS-to-SNS subscription post: https://oneuptime.com/blog/post/2026-02-12-subscribe-an-sqs-queue-to-sns/view

## Issues Found
- Qualified the ordering and duplicate-delivery claims. SNS FIFO ordering is scoped to message groups, and duplicate-free consumption with SQS FIFO depends on documented conditions such as queue permissions, no filtering, timely deletion before visibility timeout, and no delivery acknowledgment disruption.
- Corrected the subscriber limitation. Current SNS FIFO documentation supports delivery to SQS standard and FIFO queues; SQS FIFO is required when the subscriber must preserve ordering and avoid duplicates.
- Updated throughput guidance. SNS FIFO topics now support 300 messages per second per message group and 3000 messages per second per topic by default, with high-throughput mode available through `FifoThroughputScope=MessageGroup`.
- Updated deduplication wording. Duplicate messages inside the deduplication interval are accepted but not delivered, rather than simply being "dropped."
- Added `RawMessageDelivery=true` to the AWS CLI subscription example so the later SQS consumer code receives the original JSON message body instead of the default SNS JSON envelope.

## Review Notes
- The AWS CLI was not installed in this workspace, so CLI syntax was verified against the official AWS CLI command reference rather than local `aws --help` output.
- The queue policy example allows SNS broadly. In production, restrict it with a condition such as `aws:SourceArn` for the specific topic.
