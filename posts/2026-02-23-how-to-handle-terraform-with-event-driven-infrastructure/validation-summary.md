# Validation Summary: How to Handle Terraform with Event-Driven Infrastructure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS EventBridge
- AWS Lambda
- Amazon SQS
- Amazon SNS
- Amazon EventBridge Schema Registry
- Amazon CloudWatch alarms
- AWS X-Ray tracing

## Sources Consulted
- Terraform AWS provider documentation for `aws_cloudwatch_event_target`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target
- Terraform AWS provider documentation for `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS provider documentation for `aws_lambda_permission`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- Terraform AWS provider documentation for `aws_sqs_queue`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue
- Terraform AWS provider documentation for `aws_sqs_queue_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue_policy
- Terraform AWS provider documentation for `aws_sns_topic_subscription`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_subscription
- Terraform AWS provider documentation for `aws_schemas_schema`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/schemas_schema
- AWS EventBridge documentation on resource-based target permissions: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- AWS SNS documentation on publishing to SQS queues: https://docs.aws.amazon.com/sns/latest/dg/sns-access-policy-use-cases.html
- AWS SNS subscription filter policy documentation: https://docs.aws.amazon.com/sns/latest/dg/sns-subscription-filter-policies.html
- AWS Lambda API documentation for supported runtimes: https://docs.aws.amazon.com/lambda/latest/api/API_FunctionConfiguration.html

## Issues Found
- The EventBridge target that sends events to an SQS queue did not include the required SQS queue resource policy. Added an `aws_sqs_queue_policy` allowing `events.amazonaws.com` to call `sqs:SendMessage` from the matching rule ARN.
- The EventBridge Lambda fan-out example defined a target for `aws_lambda_function.update_inventory` but only granted EventBridge invoke permission for `process_order`. Added a second `aws_lambda_permission` scoped to the `payment_completed` rule.
- The SNS-to-SQS subscriptions did not include SQS queue policies allowing `sns.amazonaws.com` to send messages from the topic. Added queue policies for the orders and analytics queues.
- The SNS-to-Lambda subscription did not include a Lambda resource policy allowing SNS to invoke the function. Added an `aws_lambda_permission` scoped to the SNS topic ARN.
- The analytics SNS subscription used an empty `filter_policy` while describing a subscription that receives all events. Removed the empty filter policy so the subscription has no filter, which is the clearer and standard way to receive all messages.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform validate` against the snippets. The review was performed against official Terraform AWS provider and AWS service documentation. The examples still reference supporting resources such as IAM roles, Lambda archives, KMS keys, and some queues that are assumed to be defined elsewhere in the surrounding Terraform configuration.
