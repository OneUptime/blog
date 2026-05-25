# Validation Summary: How to Create Lambda with SNS Trigger in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS Lambda
- Amazon SNS
- Amazon SQS dead letter queues
- IAM resource-based permissions
- Python Lambda handlers

## Sources Consulted
- AWS Lambda Developer Guide: Invoking Lambda functions with Amazon SNS notifications: https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html
- Amazon SNS Developer Guide: Amazon SNS message delivery retries: https://docs.aws.amazon.com/sns/latest/dg/sns-message-delivery-retries.html
- Amazon SNS Developer Guide: Amazon SNS dead-letter queues: https://docs.aws.amazon.com/sns/latest/dg/sns-dead-letter-queues.html
- Amazon SNS Developer Guide: Amazon SNS subscription filter policies: https://docs.aws.amazon.com/sns/latest/dg/sns-subscription-filter-policies.html
- Amazon SNS Developer Guide: Amazon SNS message filtering: https://docs.aws.amazon.com/sns/latest/dg/sns-message-filtering.html
- HashiCorp Terraform AWS Provider: aws_sns_topic_subscription resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_subscription

## Issues Found
- The description promised cross-account subscription examples, but the post does not include a cross-account example. Updated the description to match the actual content: filtering policies, fan-out patterns, and dead letter queues.
- The retry behavior section said SNS retries Lambda endpoints 3 times with no delay by default. AWS SNS documentation states that AWS managed endpoints such as Lambda use multiple retry phases and can retry server-side delivery failures up to 100,015 total attempts over 23 days. Updated the retry explanation accordingly.
- The introduction described the integration as having no built-in retry queue. AWS Lambda documentation says SNS invokes Lambda asynchronously and Lambda queues events while handling retries. Reworded this to clarify that there is no SQS-style queue managed by the user, while SNS and Lambda still handle retries.

## Review Notes
- The Terraform resources and attributes used in the examples, including `aws_sns_topic_subscription`, `protocol = "lambda"`, `filter_policy`, `filter_policy_scope = "MessageBody"`, `redrive_policy`, and `aws_lambda_permission`, match current provider documentation.
- AWS Lambda documentation states that SNS triggers are supported for standard SNS topics only; FIFO topics are not supported. The examples use standard topics, so no code change was required.
