# Validation Summary: How to Create an SQS Queue with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Provider for Terraform/OpenTofu
- Amazon Simple Queue Service (SQS)
- SQS standard queues
- SQS FIFO queues
- SQS dead-letter queues
- SQS queue policies

## Sources Consulted
- OpenTofu Provider Requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu Input Variables: https://opentofu.org/docs/language/values/variables/
- OpenTofu jsonencode Function: https://opentofu.org/docs/language/functions/jsonencode/
- OpenTofu CLI init command: https://opentofu.org/docs/cli/commands/init/
- OpenTofu CLI plan command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI apply command: https://opentofu.org/docs/cli/commands/apply/
- HashiCorp AWS Provider v5.100.0 aws_sqs_queue resource documentation source: https://github.com/hashicorp/terraform-provider-aws/blob/v5.100.0/website/docs/r/sqs_queue.html.markdown
- HashiCorp AWS Provider v5.100.0 aws_sqs_queue_policy resource documentation source: https://github.com/hashicorp/terraform-provider-aws/blob/v5.100.0/website/docs/r/sqs_queue_policy.html.markdown
- AWS SQS SetQueueAttributes API Reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_SetQueueAttributes.html
- AWS SQS queue parameter configuration: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-configure-queue-parameters.html
- AWS SQS dead-letter queues: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/SQSDeadLetterQueue.html
- AWS SQS FIFO queues: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-fifo-queues.html
- AWS SQS FIFO queue identifiers and `.fifo` suffix: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-fifo-queue-message-identifiers.html
- AWS SQS content-based deduplication: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html
- AWS SQS long polling best practices: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/best-practices-setting-up-long-polling.html
- AWS SQS encryption at rest: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-server-side-encryption.html

## Issues Found
- The OpenTofu examples referenced `var.aws_region` and `var.publisher_role_arn` without declaring those input variables. Added `variable` blocks so the snippets are valid OpenTofu configuration.
- The `max_message_size` comment labeled `262144` bytes as `256 KB`. Updated it to `256 KiB`, which matches the binary unit used by the AWS provider documentation.
- The `maxReceiveCount` comment said the message moves to the DLQ after 5 failed attempts. Updated it to say the move happens when `ReceiveCount` exceeds 5, matching Amazon SQS redrive policy behavior.

## Review Notes
- The post pins the AWS provider to `~> 5.0`; the AWS provider v5.100.0 documentation lists `max_message_size` as 1024 to 262144 bytes. Current Amazon SQS API documentation lists the service limit as up to 1 MiB, so future updates that move the tutorial to AWS provider v6+ may want to revisit the example value.
- I could not run `tofu validate` locally because neither `tofu` nor `terraform` is installed in this environment; the review was performed against official documentation and the provider documentation source.
