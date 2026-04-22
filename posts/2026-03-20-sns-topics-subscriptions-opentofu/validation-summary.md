# Validation Summary: How to Create SNS Topics and Subscriptions with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu provider configuration
- AWS provider for OpenTofu/Terraform
- Amazon SNS topics, FIFO topics, subscriptions, filter policies, and topic policies
- Amazon SQS queue subscriptions and queue policies
- AWS Lambda permissions for SNS invocation
- AWS KMS encryption for SNS topics
- Amazon CloudWatch alarm publishing to SNS

## Sources Consulted
- OpenTofu Provider Requirements - https://opentofu.org/docs/language/providers/requirements/
- HashiCorp AWS Provider v5.30.0 `aws_sns_topic` documentation - https://github.com/hashicorp/terraform-provider-aws/blob/v5.30.0/website/docs/r/sns_topic.html.markdown
- HashiCorp AWS Provider v5.30.0 `aws_sns_topic_subscription` documentation - https://github.com/hashicorp/terraform-provider-aws/blob/v5.30.0/website/docs/r/sns_topic_subscription.html.markdown
- HashiCorp AWS Provider v5.30.0 `aws_sns_topic_policy` documentation - https://github.com/hashicorp/terraform-provider-aws/blob/v5.30.0/website/docs/r/sns_topic_policy.html.markdown
- HashiCorp AWS Provider v5.30.0 `aws_sqs_queue_policy` documentation - https://github.com/hashicorp/terraform-provider-aws/blob/v5.30.0/website/docs/r/sqs_queue_policy.html.markdown
- HashiCorp AWS Provider v5.30.0 `aws_lambda_permission` documentation - https://github.com/hashicorp/terraform-provider-aws/blob/v5.30.0/website/docs/r/lambda_permission.html.markdown
- Amazon SNS message filtering - https://docs.aws.amazon.com/sns/latest/dg/sns-message-filtering.html
- Amazon SNS filter policy constraints - https://docs.aws.amazon.com/sns/latest/dg/subscription-filter-policy-constraints.html
- Amazon SNS FIFO topic ordering and deduplication - https://docs.aws.amazon.com/sns/latest/dg/sns-fifo-topics.html
- Amazon SNS FIFO message ordering details - https://docs.aws.amazon.com/sns/latest/dg/fifo-topic-message-ordering.html
- Amazon SNS FIFO message deduplication - https://docs.aws.amazon.com/sns/latest/dg/fifo-message-dedup.html
- Amazon SNS SQS queue subscription guide - https://docs.aws.amazon.com/sns/latest/dg/subscribe-sqs-queue-to-sns-topic.html
- Amazon CloudWatch alarm SNS notification policy guidance - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Notify_Users_Alarm_Changes.html
- AWS re:Post Knowledge Center: CloudWatch alarm with encrypted SNS topic - https://repost.aws/knowledge-center/cloudwatch-configure-alarm-sns

## Issues Found
- **FIFO delivery guarantee wording**: The post described SNS FIFO topics as providing "ordered, exactly-once message delivery" without qualifying that the strongest ordering and duplicate-suppression behavior depends on FIFO-compatible subscribers, especially SQS FIFO queues. Updated the FIFO topic comment and best-practice bullet to tie the guidance to SQS FIFO subscribers and duplicate suppression.
- **Encrypted topic with CloudWatch alarms**: The topic used the AWS-managed SNS KMS key `alias/aws/sns`, while a later policy allowed CloudWatch alarms to publish to the same topic. AWS documents that CloudWatch alarms require a customer-managed KMS key with key policy permissions when publishing to an encrypted SNS topic. Updated the example to use `var.sns_kms_key_id` and added a short code comment calling out the customer-managed key requirement for AWS service publishers such as CloudWatch alarms.
- **CloudWatch confused deputy protection**: The CloudWatch publish statement granted `sns:Publish` to the CloudWatch service principal without source restrictions. Added `aws:SourceArn` and `aws:SourceAccount` conditions following the CloudWatch documentation's recommended pattern.

## Review Notes
- The AWS provider resource names and arguments shown in the snippets are valid for the pinned `hashicorp/aws` `~> 5.30` provider line.
- Email and HTTP/HTTPS subscriptions are valid but partially supported by the AWS provider because the endpoint must confirm the subscription outside Terraform unless it auto-confirms.
- `raw_message_delivery = true` for SQS subscribers is valid and removes the SNS JSON envelope, so consumers that need SNS metadata should leave it disabled.
- Attribute-based filter policies require matching message attributes, and numeric matching requires the published attribute to use the `Number` type.
