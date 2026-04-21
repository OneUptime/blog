# Validation Summary: How to Deploy Step Functions with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS Step Functions
- Amazon States Language
- AWS Lambda
- AWS IAM
- Amazon CloudWatch Logs
- AWS X-Ray

## Sources Consulted
- AWS Step Functions: Choosing workflow type in Step Functions: https://docs.aws.amazon.com/step-functions/latest/dg/choosing-workflow-type.html
- AWS Step Functions: Using CloudWatch Logs to log execution history: https://docs.aws.amazon.com/step-functions/latest/dg/cw-logs.html
- AWS Step Functions: Trace Step Functions request data in AWS X-Ray: https://docs.aws.amazon.com/step-functions/latest/dg/concepts-xray-tracing.html
- AWS Step Functions: Invoke an AWS Lambda function with Step Functions: https://docs.aws.amazon.com/step-functions/latest/dg/connect-lambda.html
- AWS Step Functions: Handling errors in Step Functions workflows: https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html
- AWS Step Functions pricing: https://aws.amazon.com/step-functions/pricing/
- Terraform AWS provider `aws_sfn_state_machine` resource documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/sfn_state_machine.html.markdown
- OpenTofu `jsonencode` function documentation: https://opentofu.org/docs/language/functions/jsonencode/

## Issues Found
- The IAM policy allowed Step Functions to invoke only the Standard workflow Lambda functions, but the Express workflow used `transform` and `load` functions with the same execution role. Added `aws_lambda_function.transform.arn` and `aws_lambda_function.load.arn` to the `lambda:InvokeFunction` resources.
- The CloudWatch Logs permissions did not match the AWS Step Functions logging policy example and omitted required log delivery actions such as `logs:GetLogDelivery`, `logs:UpdateLogDelivery`, `logs:DeleteLogDelivery`, `logs:ListLogDeliveries`, `logs:PutResourcePolicy`, and `logs:CreateLogStream`. Updated the policy to match the AWS-documented action set.
- The X-Ray permissions omitted `xray:PutTelemetryRecords` and `xray:GetSamplingTargets`, which AWS lists for Step Functions tracing. Added both actions.
- The Express workflow comments described Express workflows as universally at-least-once. AWS documents asynchronous Express executions as at-least-once and synchronous Express executions as at-most-once, so the wording now specifies asynchronous executions.
- The Express logging comments incorrectly said CloudWatch Logs and `level = "ALL"` are required for Express workflows. Updated the wording to explain that CloudWatch Logs are needed to inspect Express execution history and that `ALL` logs all events when full history is needed.
- The best-practices section claimed Express workflows are "10x cheaper." AWS pricing depends on requests, duration, memory, and state transitions, so this was changed to "can reduce costs at scale."
- The best-practices section referred to avoiding a "single top-level catch," but Step Functions catchers are defined on Task, Parallel, and Map states rather than at the state machine top level. Reworded the guidance to recommend task-state catches where distinct recovery paths are needed.

## Review Notes
The snippets are partial infrastructure examples and assume provider configuration, variables, and Lambda function resources exist elsewhere. The CloudWatch log group names are valid, but AWS recommends `/aws/vendedlogs/states` prefixes in some accounts to avoid CloudWatch Logs resource policy size limits.
