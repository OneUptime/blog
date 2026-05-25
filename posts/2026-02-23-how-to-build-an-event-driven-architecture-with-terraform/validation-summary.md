# Validation Summary: How to Build an Event-Driven Architecture with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AWS EventBridge
- Amazon SNS
- Amazon SQS
- AWS Lambda
- Amazon DynamoDB
- Amazon API Gateway HTTP APIs
- Amazon CloudWatch alarms
- AWS KMS encryption

## Sources Consulted
- AWS EventBridge resource-based policy documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- Amazon SNS subscription filter policy scope documentation: https://docs.aws.amazon.com/sns/latest/dg/sns-message-filtering-scope.html
- Amazon SNS subscription filter policy documentation: https://docs.aws.amazon.com/sns/latest/dg/sns-subscription-filter-policies.html
- Amazon SNS KMS encryption documentation: https://docs.aws.amazon.com/sns/latest/dg/sns-key-management.html
- Amazon SNS encrypted topic to encrypted SQS subscription documentation: https://docs.aws.amazon.com/sns/latest/dg/sns-enable-encryption-for-topic-sqs-queue-subscriptions.html
- AWS Lambda SQS event source mapping documentation: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html
- AWS Lambda SQS behavior documentation: https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
- Terraform AWS provider `aws_sns_topic_subscription` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_subscription
- Terraform AWS provider `aws_lambda_event_source_mapping` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_event_source_mapping
- Terraform AWS Lambda and API Gateway tutorial: https://developer.hashicorp.com/terraform/tutorials/aws/lambda-api-gateway
- Terraform AWS provider `aws_apigatewayv2_integration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_integration

## Issues Found
- The EventBridge event pattern examples used an unquoted `detail-type` key. Changed it to `"detail-type"` so the JSON key is unambiguous in Terraform object syntax.
- The user SNS topic had an EventBridge target but no matching `aws_sns_topic_policy`. Added a policy so EventBridge can publish to both SNS topics.
- The SNS subscription filter was intended to match EventBridge event payload fields, but SNS filters default to message attributes. Added `filter_policy_scope = "MessageBody"` and quoted the `detail-type` payload key.
- The notification SQS queue was subscribed to SNS but had no queue policy allowing SNS to call `sqs:SendMessage`. Added the missing `aws_sqs_queue_policy`.
- The SQS visibility timeouts matched the Lambda timeouts too closely for Lambda event source mapping guidance. Increased them to account for AWS Lambda's recommended SQS visibility timeout sizing.
- The Lambda event source mapping comment incorrectly implied ordered processing by message group on a standard SQS queue. Reworded it to describe partial batch failure reporting.
- The API Gateway HTTP API Lambda integration omitted `integration_method = "POST"` and the Lambda permission that allows API Gateway to invoke the function. Added both.

## Review Notes
The snippets still assume supporting resources that are referenced but not shown, such as IAM roles, KMS key policy statements, Lambda deployment ZIP files, security groups, CloudWatch log groups, and the `event_publisher` Lambda. For encrypted SNS and SQS paths using a customer-managed KMS key, the key policy must also grant the relevant AWS service principals and Lambda execution roles the required KMS permissions.
