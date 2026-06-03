# Validation Summary: How to Configure Lambda Memory and Timeout Settings

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- Amazon CloudWatch Logs and Logs Insights
- AWS CLI
- AWS SAM / CloudFormation
- Terraform AWS provider
- Python

## Sources Consulted
- AWS Lambda quotas: https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- AWS Lambda timeout configuration: https://docs.aws.amazon.com/lambda/latest/dg/configuration-timeout.html
- AWS Lambda CloudWatch metric types: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html
- Viewing CloudWatch logs for Lambda functions: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs-view.html
- AWS CLI `get-function-configuration`: https://docs.aws.amazon.com/cli/latest/reference/lambda/get-function-configuration.html
- AWS CLI `update-function-configuration`: https://docs.aws.amazon.com/cli/latest/reference/lambda/update-function-configuration.html
- AWS CLI `logs start-query`: https://docs.aws.amazon.com/cli/latest/reference/logs/start-query.html
- AWS Lambda pricing: https://aws.amazon.com/lambda/pricing/
- AWS SAM `AWS::Serverless::Function`: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html
- AWS CloudFormation `AWS::Lambda::Function`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-function.html
- Terraform AWS provider `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- AWS Lambda Power Tuning project: https://github.com/alexcasalboni/aws-lambda-power-tuning

## Issues Found
- The monitoring section uses CloudWatch Logs Insights rather than a standard `AWS/Lambda` metric for `MaxMemoryUsed`. This is correct because Lambda REPORT fields such as `@maxMemoryUsed` and `@memorySize` are exposed through Lambda logs and Logs Insights, while `MaxMemoryUsed` is not listed as a standard `AWS/Lambda` metric. The README already contained this corrected approach in the local workspace during review, so no additional README change was needed for this issue.
- CloudWatch Logs Insights queries are asynchronous. Added a comment telling readers to repeat `get-query-results` until the query status is `Complete`.
- The cost calculator comment gave a single `us-east-1` price without noting architecture. AWS Lambda pricing differs by architecture, so the comment now specifies that the `0.0000166667` GB-second price is for x86 in `us-east-1`.

## Review Notes
- The Lambda memory range, 1 MB increment, timeout range, default timeout, proportional CPU allocation, and 1,769 MB per vCPU reference matched AWS documentation.
- The AWS CLI commands for viewing and updating Lambda configuration use current command names and options.
- The SAM, CloudFormation, and Terraform property names are current for Lambda memory and timeout configuration.
- The internal OneUptime links and the AWS Lambda Power Tuning reference were reachable and relevant.
