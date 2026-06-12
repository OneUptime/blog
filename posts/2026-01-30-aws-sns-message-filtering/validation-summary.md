# Validation Summary: How to Implement AWS SNS Message Filtering

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon SNS
- Amazon SQS
- AWS SDK for Python (Boto3)
- AWS CLI
- Terraform AWS Provider
- CloudWatch metrics
- IAM resource policies

## Sources Consulted
- Amazon SNS message filtering: https://docs.aws.amazon.com/sns/latest/dg/sns-message-filtering.html
- Amazon SNS subscription filter policies: https://docs.aws.amazon.com/sns/latest/dg/sns-subscription-filter-policies.html
- Amazon SNS subscription filter policy scope: https://docs.aws.amazon.com/sns/latest/dg/sns-message-filtering-scope.html
- Amazon SNS filter policy constraints: https://docs.aws.amazon.com/sns/latest/dg/subscription-filter-policy-constraints.html
- Amazon SNS string value matching: https://docs.aws.amazon.com/sns/latest/dg/string-value-matching.html
- Amazon SNS numeric value matching: https://docs.aws.amazon.com/sns/latest/dg/numeric-value-matching.html
- Amazon SNS AND/OR logic: https://docs.aws.amazon.com/sns/latest/dg/and-or-logic.html
- Applying a subscription filter policy in Amazon SNS: https://docs.aws.amazon.com/sns/latest/dg/message-filtering-apply.html
- Amazon SNS CloudWatch metrics: https://docs.aws.amazon.com/sns/latest/dg/sns-monitoring-using-cloudwatch.html
- Cross-account SNS to SQS subscriptions: https://docs.aws.amazon.com/sns/latest/dg/sns-send-message-to-sqs-cross-account.html
- Boto3 SNS subscribe reference: https://docs.aws.amazon.com/boto3/latest/reference/services/sns/client/subscribe.html
- Boto3 SNS publish reference: https://docs.aws.amazon.com/boto3/latest/reference/services/sns/client/publish.html
- AWS CLI sns subscribe reference: https://docs.aws.amazon.com/cli/latest/reference/sns/subscribe.html
- Terraform AWS Provider sns_topic_subscription documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_subscription

## Issues Found
- The IP Address (CIDR) Match section incorrectly said CIDR matching only works with `MessageBody` scope. AWS documents the `cidr` operator as matching string values in message attributes and message body properties. Updated the sentence to reflect both supported scopes.
- The Terraform configuration referenced `aws_sqs_queue.high_value_orders.arn` but did not define the high-value orders queue or a queue policy allowing SNS to send to it. Added the missing `aws_sqs_queue.high_value_orders` resource and matching `aws_sqs_queue_policy.high_value_orders_policy`.

## Review Notes
The Python snippets were checked for syntax, and the JSON filter policy snippets were parsed successfully. The code examples use current SNS, SQS, Boto3, AWS CLI, and Terraform concepts. AWS notes that filter policy changes can take up to 15 minutes to fully take effect, so the short sleeps in the runnable Python example are suitable for a quick demo but may not be reliable immediately after changing filters in all real environments.
