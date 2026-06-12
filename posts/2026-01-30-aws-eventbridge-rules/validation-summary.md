# Validation Summary: How to Create AWS EventBridge Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS EventBridge rules
- AWS EventBridge event patterns and input transformers
- AWS CLI
- Terraform AWS provider
- AWS CDK for TypeScript
- Python Boto3
- AWS Lambda
- Amazon SQS and SNS targets

## Sources Consulted
- AWS EventBridge User Guide: Event bus targets in Amazon EventBridge - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-targets.html
- AWS EventBridge User Guide: Using resource-based policies for Amazon EventBridge - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- AWS EventBridge User Guide: Setting a schedule pattern for scheduled rules (legacy) - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html
- AWS EventBridge User Guide: Comparison operators for event patterns - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-pattern-operators.html
- AWS EventBridge User Guide: Amazon EventBridge input transformation - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-transform-target-input.html
- AWS Lambda Developer Guide: Lambda runtimes - https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS CDK API Reference: aws-events-targets LambdaFunction - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events_targets.LambdaFunction.html
- Boto3 Events client reference: put_rule, put_targets, and put_events - https://docs.aws.amazon.com/boto3/latest/reference/services/events.html
- Boto3 Lambda client reference: add_permission - https://docs.aws.amazon.com/boto3/latest/reference/services/lambda/client/add_permission.html
- HashiCorp AWS Provider docs source: aws_cloudwatch_event_target - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudwatch_event_target.html.markdown

## Issues Found
- The AWS CLI Lambda target example added a Lambda target but did not grant EventBridge permission to invoke the function. Added an `aws lambda add-permission` command scoped to the rule ARN.
- The input transformer example used unquoted string variables in a JSON object template. Updated `orderId` and `customerEmail` placeholders to be quoted while keeping numeric `amount` unquoted.
- The scheduled rules section did not mention that EventBridge scheduled rules are now the legacy scheduling option. Added a short note that AWS recommends EventBridge Scheduler for new scheduled workloads.
- The Terraform Lambda target examples omitted the required `aws_lambda_permission` resources. Added permissions for both the event-pattern rule target and scheduled rule target.
- The AWS CDK example used `lambda.Runtime.NODEJS_18_X`, which is deprecated in AWS Lambda as of this review date. Updated it to `lambda.Runtime.NODEJS_22_X`.
- The Boto3 Lambda target example added the EventBridge target without granting Lambda invoke permission. Added a Lambda client and an idempotent `add_permission` call before `put_targets`.

## Review Notes
The EventBridge pattern operators, cron/rate examples, AWS CLI `events put-rule` and `events put-targets` structures, Terraform `aws_cloudwatch_event_rule` / `aws_cloudwatch_event_target` resources, CDK rule/target constructs, and Boto3 EventBridge client calls were otherwise consistent with the referenced documentation. The AWS CLI was not installed locally, so CLI validation was performed against official AWS documentation rather than local `--help` output.
