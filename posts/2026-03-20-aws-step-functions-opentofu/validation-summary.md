# Validation Summary: How to Deploy AWS Step Functions with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Step Functions
- AWS Lambda
- Amazon EventBridge
- Amazon CloudWatch Logs
- AWS IAM
- Amazon States Language (ASL)

## Sources Consulted
- AWS Step Functions: Using CloudWatch Logs to log execution history in Step Functions — https://docs.aws.amazon.com/step-functions/latest/dg/cw-logs.html
- AWS Step Functions: Invoke an AWS Lambda function with Step Functions — https://docs.aws.amazon.com/step-functions/latest/dg/connect-lambda.html
- AWS Step Functions: Choosing workflow type in Step Functions — https://docs.aws.amazon.com/step-functions/latest/dg/choosing-workflow-type.html
- AWS Step Functions: Handling errors in Step Functions workflows — https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html
- Amazon EventBridge: IAM roles for sending events to targets in Amazon EventBridge — https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-events-iam-roles.html
- Terraform Registry: `aws_cloudwatch_event_target` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target
- OpenTofu: Configuration Syntax — https://opentofu.org/docs/language/syntax/configuration/
- OpenTofu: `jsonencode` Function — https://opentofu.org/docs/language/functions/jsonencode/

## Issues Found
- The Step Functions execution role allowed `lambda:InvokeFunction` on `aws_lambda_function.process` and `aws_lambda_function.notify`, but the state machine actually invokes `validate`, `payment`, and `notify`. I updated the IAM policy to match the Lambda functions used by the workflow.
- The CloudWatch Logs permissions were incomplete for Step Functions log delivery. I expanded the logging actions to match AWS's documented policy requirements for state machine logging.
- The EventBridge target referenced `aws_iam_role.eventbridge_sfn` without defining it. I added the missing EventBridge IAM role and inline policy granting `states:StartExecution` on the state machine.

## Review Notes
- The snippets still assume `aws_lambda_function.validate`, `aws_lambda_function.payment`, and `aws_lambda_function.notify` are defined elsewhere in the same OpenTofu configuration.
- The log group name `/aws/states/${var.name}` is valid. AWS also documents `/aws/vendedlogs/states...` as a useful naming pattern when you need to avoid CloudWatch Logs resource-policy size limits.
