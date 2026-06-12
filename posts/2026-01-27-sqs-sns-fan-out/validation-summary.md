# Validation Summary: How to Use SQS with SNS for Fan-Out

## Status
validated

## Post Type
Tutorial / Guide (with hands-on Terraform + Python examples for the SNS → SQS fan-out pattern on AWS)

## Technologies Covered
- Amazon Simple Notification Service (SNS)
- Amazon Simple Queue Service (SQS)
- AWS Identity and Access Management (IAM)
- AWS Key Management Service (KMS) — used for SNS/SQS encryption alias
- Terraform / HCL (AWS provider resources: `aws_sns_topic`, `aws_sns_topic_subscription`, `aws_sqs_queue`, `aws_sqs_queue_policy`, `aws_iam_policy_document`)
- Python 3 + boto3 (SNS publish, SQS receive/delete)
- CloudWatch metrics for SNS/SQS observability
- SNS filter policies (MessageAttributes scope, numeric / prefix / anything-but operators)

## Sources Consulted
- AWS SNS Developer Guide — Subscription filter policies: https://docs.aws.amazon.com/sns/latest/dg/sns-subscription-filter-policies.html
- AWS SNS Developer Guide — Message attributes: https://docs.aws.amazon.com/sns/latest/dg/sns-message-attributes.html
- AWS SNS Developer Guide — Raw message delivery: https://docs.aws.amazon.com/sns/latest/dg/sns-large-payload-raw-message-delivery.html
- AWS SNS Developer Guide — Fanout to SQS queues: https://docs.aws.amazon.com/sns/latest/dg/sns-sqs-as-subscriber.html
- AWS SQS Developer Guide — Visibility timeout, retention, long polling, dead-letter queues
- AWS SQS Developer Guide — CloudWatch metrics: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-monitoring-using-cloudwatch.html
- AWS provider docs (terraform-provider-aws) for `aws_sns_topic`, `aws_sns_topic_subscription`, `aws_sqs_queue`, `aws_sqs_queue_policy`, `aws_iam_policy_document`
- boto3 documentation — `SNS.Client.publish`, `SQS.Client.receive_message`, `SQS.Client.delete_message`

## Issues Found
1. **Incorrect claim about message attributes under raw message delivery.** The original "Warning" stated: *"With raw delivery, you lose access to SNS message attributes in the consumer. If you use filter policies, the filtering still works, but the consumer cannot see which attributes matched."* This is wrong. Per the AWS SNS docs on raw message delivery, when raw delivery is enabled on an SQS subscription, the original SNS message attributes ARE forwarded and delivered to SQS as SQS message attributes — the consumer can read them via the standard `MessageAttributes` field on the SQS message. What's actually lost is the SNS envelope metadata (TopicArn, Timestamp, SNS MessageId, Subject, etc.). I rewrote the note to reflect this correctly.
2. **Incorrect parenthetical in the raw-delivery Python example.** The comment said attributes-as-SQS-attributes *"only works if your publisher uses SQS directly or SNS FIFO topics with raw delivery"*. This is also wrong — it works for SNS Standard topics with `raw_message_delivery = true` as well. I removed the misleading parenthetical and replaced the snippet with one that actually reads `message['MessageAttributes']` to demonstrate the correct access pattern, consistent with the updated note.

## Review Notes
- All Terraform resources, attribute names, and types are valid in current `hashicorp/aws` provider (`aws_sns_topic`, `aws_sns_topic_subscription` with `raw_message_delivery`/`filter_policy`/`filter_policy_scope`, `aws_sqs_queue` with `redrive_policy`, `aws_sqs_queue_policy`, `aws_iam_policy_document`). Note that the provider also offers a separate `aws_sqs_queue_redrive_policy` resource — using the inline `redrive_policy` attribute on `aws_sqs_queue` (as the post does) is still supported and is the more common pattern.
- SNS filter policy syntax shown — string match, numeric range `[">=", 10, "<=", 100]`, `prefix`, `anything-but`, and boolean `[true]` — is all valid per the SNS filter policy reference.
- For the Number attribute (`order_total`), the code correctly sets `DataType: 'Number'` and passes the value as `StringValue` (a string representation). That is the documented boto3 contract.
- `MaxNumberOfMessages` max of 10 and `WaitTimeSeconds` max of 20 (long polling) are accurate.
- `message_retention_seconds = 1209600` (14 days) is the SQS max — correct.
- The "6× expected processing time" rule of thumb for visibility timeout is a reasonable heuristic, not an AWS-published rule; not incorrect, just opinionated guidance.
- `AttributeNames=['All']` in `receive_message` still works; boto3 newer parameter `MessageSystemAttributeNames` is the modern replacement but the legacy parameter remains supported, so no change needed.
- The note that SNS will *silently* fail when queue policies are missing is accurate — SNS reports successful publish but the SQS-side delivery is dropped (visible via SNS `NumberOfNotificationsFailed` metric, not in the publisher's response).
- The post does not specify a Terraform/AWS provider version. The HCL uses `optional(...)` defaults in object types, which requires Terraform 1.3+; readers on older Terraform versions would need to adjust. Worth noting as a forward improvement, not a correctness issue.
