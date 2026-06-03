# Validation Summary: How to Compare SQS vs SNS vs EventBridge vs MQ

## Status
validated

## Post Type
Technical guide / comparison reference

## Technologies Covered
- Amazon SQS
- Amazon SNS
- Amazon EventBridge
- Amazon MQ
- AWS Lambda event source mappings
- Python / Boto3

## Sources Consulted
- Amazon SQS message quotas: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html
- Amazon SQS pricing: https://aws.amazon.com/sqs/pricing/
- Amazon SNS message filtering: https://docs.aws.amazon.com/sns/latest/dg/sns-message-filtering.html
- Amazon SNS message archiving and replay for FIFO topics: https://docs.aws.amazon.com/sns/latest/dg/fifo-message-archiving-replay.html
- Amazon SNS pricing: https://aws.amazon.com/sns/pricing/
- Amazon EventBridge PutEvents API reference: https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_PutEvents.html
- Sending events with PutEvents in Amazon EventBridge: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-putevents.html
- Amazon EventBridge archive and replay: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-archive.html
- Amazon EventBridge quotas: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-quota.html
- Amazon EventBridge pricing: https://aws.amazon.com/eventbridge/pricing/
- Amazon MQ for ActiveMQ broker protocols: https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/amazon-mq-basic-elements.html
- Amazon MQ pricing: https://aws.amazon.com/amazon-mq/pricing/
- Boto3 SQS send_message reference: https://docs.aws.amazon.com/boto3/latest/reference/services/sqs/client/send_message.html
- Amazon SNS publishing with Boto3: https://docs.aws.amazon.com/sns/latest/dg/sns-publishing.html

## Issues Found
- The feature table listed SQS max message size as 256 KB. AWS now documents a 1 MiB maximum for SQS messages, so this was updated.
- The feature table listed EventBridge max message size as 256 KB. Current EventBridge PutEvents documentation allows requests up to 1 MB, so this was updated.
- The feature table said EventBridge retention is "24 hours (replay)". EventBridge event bus events are not retained for replay unless archived, and archive retention is configurable, so this was corrected.
- The feature table said SNS has no retention. Standard topics do not retain messages for replay, but SNS FIFO topics can archive messages up to 365 days, so the row was clarified.
- The communication-pattern text said SQS messages are processed by exactly one consumer. Standard SQS is at-least-once delivery and can produce duplicates, so the wording was corrected.
- The SNS section said SNS does not store messages and a down subscriber always loses the message unless it is SQS. This was clarified to account for SNS delivery retries, durable SQS subscribers, and optional FIFO archive/replay.
- The SNS filtering row only mentioned attribute filtering. SNS also supports message-body filtering, so the row was updated.
- The SQS QueueUrl and SNS TopicArn examples used 9-digit account IDs. AWS account IDs are 12 digits, so both examples were changed to `123456789012`.
- The pricing section used overspecific or outdated phrasing for SQS, SNS, EventBridge, and Amazon MQ. The wording was updated to reflect current pricing models, payload chunk billing, and dynamic regional pricing without hard-coding misleading broker instance ranges.

## Review Notes
The Python snippets use valid Boto3 client calls for SQS `send_message` and SNS `publish`. The EventBridge event pattern syntax is valid for nested field and numeric matching. Exact service prices vary by region and can change, so future posts should avoid hard-coding detailed price ranges unless the region and review date are stated.
