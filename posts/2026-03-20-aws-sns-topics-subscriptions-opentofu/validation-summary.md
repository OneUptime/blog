# Validation Summary: How to Create AWS SNS Topics and Subscriptions with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS SNS
- AWS SQS
- AWS Lambda
- AWS KMS
- AWS IAM policy JSON
- HCL

## Sources Consulted
- OpenTofu `init` command: https://opentofu.org/docs/cli/init/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command: https://opentofu.org/docs/v1.11/cli/commands/apply/
- AWS provider `aws_sns_topic` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic
- AWS provider `aws_sns_topic_policy` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_policy
- AWS provider `aws_sns_topic_subscription` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_subscription
- AWS provider `aws_sqs_queue_policy` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue_policy
- AWS provider `aws_lambda_permission` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- Amazon SNS topic encryption: https://docs.aws.amazon.com/sns/latest/dg/sns-enable-encryption-for-topic.html
- Subscribing an Amazon SQS queue to an Amazon SNS topic: https://docs.aws.amazon.com/sns/latest/dg/subscribe-sqs-queue-to-sns-topic.html
- Invoking Lambda functions with Amazon SNS notifications: https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html
- Example cases for Amazon SNS access control: https://docs.aws.amazon.com/sns/latest/dg/sns-access-policy-use-cases.html
- Creating a subscription to an Amazon SNS topic: https://docs.aws.amazon.com/sns/latest/dg/sns-create-subscribe-endpoint-to-topic.html

## Issues Found
- The description claimed the post covered HTTP endpoint subscriptions, but the body only covered email, SQS, and Lambda. I corrected the description so it matches the actual content.
- The Lambda subscription example did not model AWS's documented prerequisite of granting SNS permission to invoke the function before creating the subscription. I added `depends_on = [aws_lambda_permission.sns_invoke]` to make the apply order explicit and deterministic.

## Review Notes
- Email subscriptions are partially supported until the recipient confirms the subscription. If an email subscription remains unconfirmed, the AWS provider cannot cleanly unsubscribe it during destroy.
- Lambda supports SNS triggers for standard SNS topics only. The post is correct because the Lambda example uses a standard topic and the FIFO example is separate.
