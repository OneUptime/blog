# Validation Summary: How to Configure S3 Event Notifications with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Terraform/OpenTofu HCL
- AWS provider for OpenTofu/Terraform
- Terraform Archive provider
- Amazon S3 event notifications
- AWS Lambda
- Amazon SQS
- Amazon SNS
- Amazon EventBridge

## Sources Consulted
- Amazon S3 event notification types and destinations: https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-how-to-event-types-and-destinations.html
- Amazon S3 destination permission requirements for Lambda, SQS, and SNS: https://docs.aws.amazon.com/AmazonS3/latest/userguide/grant-destinations-permissions-to-s3.html
- Amazon S3 EventBridge behavior and supported events: https://docs.aws.amazon.com/AmazonS3/latest/userguide/EventBridge.html
- Amazon S3 EventBridge event message structure: https://docs.aws.amazon.com/AmazonS3/latest/userguide/ev-events.html
- Amazon EventBridge event pattern syntax and numeric matching: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-pattern.html and https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-pattern-operators.html
- AWS Lambda S3 event notification invocation model: https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html
- Terraform AWS provider `aws_s3_bucket_notification` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket_notification.html.markdown
- Terraform AWS provider `aws_cloudwatch_event_rule` and `aws_cloudwatch_event_target` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudwatch_event_rule.html.markdown and https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudwatch_event_target.html.markdown
- Terraform AWS provider `aws_lambda_function`, `aws_lambda_permission`, `aws_sqs_queue_policy`, and `aws_sns_topic_policy` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lambda_function.html.markdown, https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lambda_permission.html.markdown, https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/sqs_queue_policy.html.markdown, https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/sns_topic_policy.html.markdown
- Terraform Archive provider `archive_file` docs: https://github.com/hashicorp/terraform-provider-archive/blob/main/docs/data-sources/file.md
- OpenTofu CLI command documentation: https://opentofu.org/docs/cli/commands/, https://opentofu.org/docs/cli/commands/plan/, and https://opentofu.org/docs/v1.11/cli/commands/apply/

## Issues Found
- The prerequisites only mentioned S3, Lambda, and SQS permissions, but the examples also create SNS policies, EventBridge rules and targets, and Lambda/resource policies. I updated the prerequisite to include SNS, EventBridge, and IAM permissions.
- The description used generic "modified" wording. Amazon S3 event notifications are based on supported event types, so I changed the description to say "supported S3 object events."
- The original EventBridge example declared a second `aws_s3_bucket_notification` for the same bucket. The AWS provider documents that this resource manages the single bucket notification configuration and multiple resources for one bucket will overwrite or fight each other, so I moved `eventbridge = true` into the existing notification resource.
- The EventBridge section created only an event rule even though the text said it routed large uploads to a target. I added `aws_cloudwatch_event_target` and the required `aws_lambda_permission` for `events.amazonaws.com`.
- The SNS notification comment said it published all deletions. S3 `ObjectRemoved` notifications do not include automatic lifecycle deletes, so I changed the wording to "object removal events."
- The conclusion described Lambda as synchronous processing. AWS documents S3-to-Lambda event notifications as asynchronous, so I changed it to "direct asynchronous processing."

## Review Notes
- The corrected examples use current AWS provider resource names and arguments for S3 notifications, Lambda permissions, SQS/SNS destination policies, and EventBridge rules and targets.
- EventBridge delivery for an S3 bucket can take around five minutes to become active after it is enabled.
- SNS FIFO topics and SQS FIFO queues are not supported as direct S3 notification destinations; EventBridge is the documented path when FIFO delivery targets are needed.
- `tofu validate` was not run because the post is a set of excerpts that assumes supporting declarations such as `var.project_name`, `var.lambda_role_arn`, `data.archive_file.zip`, and `data.aws_caller_identity.current`.
