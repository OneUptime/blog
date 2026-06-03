# Validation Summary: How to Implement Event-Driven Architecture with SQS, SNS, and EventBridge

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon EventBridge
- Amazon SQS
- Amazon SNS
- AWS Lambda
- AWS CLI
- Terraform AWS provider
- Python / boto3

## Sources Consulted
- AWS EventBridge resource-based policy documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- AWS EventBridge IAM roles and target permissions documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-events-iam-roles.html
- AWS CLI `events start-replay` command reference: https://docs.aws.amazon.com/cli/latest/reference/events/start-replay.html
- boto3 EventBridge `put_events` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/events/client/put_events.html
- Amazon SNS subscription filter policy documentation: https://docs.aws.amazon.com/sns/latest/dg/sns-subscription-filter-policies.html
- Amazon SNS filter policy scope documentation: https://docs.aws.amazon.com/sns/latest/dg/sns-message-filtering-scope.html
- Amazon SNS dead-letter queue documentation: https://docs.aws.amazon.com/sns/latest/dg/sns-dead-letter-queues.html
- Amazon SQS dead-letter queue documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
- AWS Lambda with SQS documentation: https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
- Terraform AWS provider `aws_cloudwatch_event_target` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target
- Terraform AWS provider `aws_sns_topic_subscription` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_subscription
- Terraform AWS provider `aws_sqs_queue_policy` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue_policy
- Terraform AWS provider `aws_cloudwatch_event_archive` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_archive
- Referenced OneUptime article: https://oneuptime.com/blog/post/2026-02-12-monitor-sns-cloudwatch/view

## Issues Found
- The EventBridge-to-SNS target was missing a resource policy allowing `events.amazonaws.com` to publish to the SNS topic. Added an `aws_sns_topic_policy`.
- The direct EventBridge-to-SQS targets were missing SQS queue policies allowing EventBridge to call `sqs:SendMessage`. Added `aws_sqs_queue_policy` resources for the audit and high-value order queues.
- The SNS-to-SQS subscriptions were missing SQS queue policies allowing SNS to deliver messages. Added queue policies for the fulfillment and notification queues.
- The SNS subscription filters were intended to match EventBridge event payload fields, but SNS filters default to message attributes. Added `filter_policy_scope = "MessageBody"` and quoted the `detail-type` key.
- The high-value EventBridge rule described routing to a special queue but had no target or queue. Added the missing `aws_cloudwatch_event_target` and SQS queue.
- The SNS subscriptions discussed DLQ behavior but did not configure subscription redrive policies. Added a shared SNS delivery DLQ, subscription `redrive_policy` blocks, and the required DLQ queue policy.
- The SQS section said each consumer queue had a DLQ, but the audit queue lacked one. Added an audit DLQ and redrive policy.
- The EventBridge replay command used an event bus ARN for `--event-source-arn`, but the AWS CLI requires the archive ARN. Updated the command to use an archive ARN.
- The replay example used a 9-digit placeholder AWS account ID, which is not a valid AWS account ID format. Updated sample ARNs to use a 12-digit placeholder.
- The replay comment said it replayed order events, but the command replays archived events in the time window. Updated the comment and replay name.
- The Python example used `datetime.utcnow()`, which is deprecated in current Python. Updated it to use `datetime.now(timezone.utc)`.
- The error-handling section implied unmatched EventBridge events could be sent to an archive via a catch-all rule. Clarified that archives are configured on the event bus and catch-all rules can send events to an audit queue.
- The SNS error-handling section implied failed deliveries always go to a DLQ. Clarified that this happens when a subscription redrive policy is configured.

## Review Notes
- The Python consumer examples are illustrative and call application-specific functions such as `reserve_inventory`, `create_shipping_label`, and `send_email`; those functions are not defined in the post.
- The Lambda SQS consumer examples do not show partial batch response handling. For production systems, enabling `ReportBatchItemFailures` is recommended to avoid retrying successfully processed records in a failed batch.
