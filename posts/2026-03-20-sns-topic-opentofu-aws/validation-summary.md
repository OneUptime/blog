# Validation Summary: How to Create an SNS Topic with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS provider for OpenTofu/Terraform
- Amazon SNS
- Amazon SQS
- AWS Lambda
- AWS IAM resource policies
- AWS KMS server-side encryption

## Sources Consulted
- OpenTofu Provider Requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu CLI Commands: https://opentofu.org/docs/cli/commands/
- OpenTofu init command: https://opentofu.org/docs/cli/commands/init/
- OpenTofu plan command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu apply command: https://opentofu.org/docs/cli/commands/apply/
- AWS provider `aws_sns_topic` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic
- AWS provider `aws_sns_topic_subscription` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_subscription
- AWS provider `aws_sqs_queue` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue
- AWS provider `aws_sqs_queue_policy` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue_policy
- AWS provider `aws_lambda_permission` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- AWS provider `aws_sns_topic_policy` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_policy
- Amazon SNS email subscription documentation: https://docs.aws.amazon.com/sns/latest/dg/sns-email-notifications.html
- Amazon SNS SQS subscription documentation: https://docs.aws.amazon.com/sns/latest/dg/subscribe-sqs-queue-to-sns-topic.html
- Amazon SNS FIFO message delivery documentation: https://docs.aws.amazon.com/sns/latest/dg/fifo-message-delivery.html

## Issues Found
- The SNS topic example labeled `fifo_topic` and `content_based_deduplication` as a "Message retention period for FIFO topics." These arguments configure FIFO topic behavior and content-based deduplication; FIFO message archiving/replay is handled separately by `archive_policy`. Updated the comment to "FIFO topic settings."

## Review Notes
- The snippets reference variables such as `var.aws_region`, `var.notification_email`, `var.lambda_function_arn`, `var.lambda_function_name`, and `var.account_id`; the post assumes those variables are declared elsewhere.
- Email SNS subscriptions are only partially managed by the provider until the email endpoint confirms the subscription, which the post correctly notes.
- The current AWS provider major version is 6.x as of this review, while the post pins `~> 5.0`. The shown resources and arguments remain valid, but upgrading the provider constraint should be tested separately before changing an existing tutorial.
- Local OpenTofu/Terraform CLI validation was not run because neither `tofu` nor `terraform` is installed in this environment.
