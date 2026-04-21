# Validation Summary: How to Create SQS Queues with Dead Letter Queues in OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Provider for Terraform/OpenTofu
- Amazon SQS
- Amazon SQS dead-letter queues
- AWS IAM
- AWS KMS
- Amazon CloudWatch alarms
- AWS Lambda event source behavior

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu `jsonencode` function: https://opentofu.org/docs/language/functions/jsonencode/
- HashiCorp AWS provider `aws_sqs_queue` resource, v5.30.0: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/v5.30.0/website/docs/r/sqs_queue.html.markdown
- HashiCorp AWS provider `aws_cloudwatch_metric_alarm` resource, v5.30.0: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/v5.30.0/website/docs/r/cloudwatch_metric_alarm.html.markdown
- Amazon SQS dead-letter queues: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
- Amazon SQS CloudWatch metrics: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html
- Amazon SQS dead-letter queue CloudWatch alarms: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/dead-letter-queues-alarms-cloudwatch.html
- Amazon SQS encryption at rest: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-server-side-encryption.html
- Amazon SQS KMS key management: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-key-management.html
- AWS KMS aliases and key identifiers: https://docs.aws.amazon.com/kms/latest/developerguide/kms-alias.html
- AWS Lambda with Amazon SQS: https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
- Amazon SQS visibility timeout: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html
- Amazon SQS dead-letter queue redrive: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-configure-dead-letter-queue-redrive.html

## Issues Found
- The introduction said failed messages without DLQs are reprocessed indefinitely or silently disappear. SQS messages are retained only for the configured retention period, so this was changed to say they can be retried until they process successfully or expire from the source queue.
- The main queue comment said the visibility timeout only needed to be greater than or equal to the Lambda timeout. AWS Lambda recommends at least six times the function timeout, plus `MaximumBatchingWindowInSeconds`, so the comment and best-practice bullet were updated.
- The IAM policy included `arn:aws:kms:${var.aws_region}:*:key/alias/aws/sqs` for `kms:Decrypt`. That ARN does not identify a KMS key; KMS key ARNs use `key/<key-id>`, and aliases are separate resources. Because the queue example uses the AWS managed SQS key `alias/aws/sqs`, the extra KMS statement was removed from the same-account SQS caller policy.
- The post used absolute wording that every DLQ message always indicates processing failure. This was softened to "usually" and "in most production workflows" because messages can also be moved or sent intentionally.

## Review Notes
- The inline `redrive_policy` argument is valid for AWS provider v5.30.0 and current provider docs, though newer provider docs prefer separate redrive policy resources for drift detection.
- The DLQ alarm correctly uses the SQS `ApproximateNumberOfMessagesVisible` metric with the `QueueName` dimension.
- FIFO queue and FIFO DLQ naming and type matching are correct.
