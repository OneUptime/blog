# Validation Summary: How to Set Up SNS with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SNS
- Amazon SQS
- AWS Lambda
- AWS KMS
- AWS IAM policies
- Amazon CloudWatch Logs delivery status logging
- Terraform AWS Provider
- HCL

## Sources Consulted
- Terraform AWS Provider `aws_sns_topic` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic
- Terraform AWS Provider `aws_sns_topic_subscription` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_subscription
- Terraform AWS Provider `aws_sqs_queue` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue
- Terraform AWS Provider `aws_sns_topic_policy` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_policy
- Terraform AWS Provider `aws_lambda_permission` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- Amazon SNS dead-letter queues documentation: https://docs.aws.amazon.com/sns/latest/dg/sns-dead-letter-queues.html
- Amazon SNS dead-letter queue configuration documentation: https://docs.aws.amazon.com/sns/latest/dg/sns-configure-dead-letter-queue.html
- Amazon SNS FIFO deduplication documentation: https://docs.aws.amazon.com/sns/latest/dg/fifo-message-dedup.html
- Amazon SNS filter policy scope documentation: https://docs.aws.amazon.com/sns/latest/dg/sns-message-filtering-scope.html
- Amazon SNS topic encryption documentation: https://docs.aws.amazon.com/sns/latest/dg/sns-enable-encryption-for-topic.html
- Amazon SNS delivery status logging documentation: https://docs.aws.amazon.com/sns/latest/dg/sns-topic-attributes.html
- Amazon SNS delivery status logging prerequisites: https://docs.aws.amazon.com/sns/latest/dg/topics-attrib-prereq.html

## Issues Found
- The SQS subscription example referenced `aws_sqs_queue.sns_dlq.arn` in the SNS subscription `redrive_policy`, but did not define that queue. Added an `aws_sqs_queue` resource named `sns_dlq`.
- The SNS subscription dead-letter queue did not include the SQS queue policy AWS documents as required for allowing the SNS service principal to send failed deliveries to the DLQ. Added an `aws_sqs_queue_policy` for `sns_dlq` scoped to the SNS topic ARN.
- The topic access policy introduction said the example allowed "specific services to subscribe," but the policy allows a role and CloudWatch alarms to publish, and the same AWS account to subscribe. Updated the sentence to match the policy behavior.

## Review Notes
The Terraform resource arguments used for SNS topics, subscriptions, topic policies, Lambda permissions, SQS queues, FIFO topics, delivery status logging, raw message delivery, filter policy scope, and subscription redrive policies match current Terraform AWS Provider documentation. The post uses partial snippets with assumed surrounding resources such as IAM roles, Lambda functions, and some queues; those are acceptable for a guide, but a future full example could include all dependencies in one deployable module.
