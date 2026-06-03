# Validation Summary: How to Configure Lambda Memory and Timeout Settings

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- AWS CLI
- Amazon CloudWatch Logs and Logs Insights
- AWS Serverless Application Model (SAM)
- Terraform AWS provider
- Python

## Sources Consulted
- AWS Lambda documentation: Configure Lambda function memory - https://docs.aws.amazon.com/lambda/latest/operatorguide/computing-power.html
- AWS Lambda documentation: Configure Lambda function timeout - https://docs.aws.amazon.com/lambda/latest/dg/configuration-timeout.html
- AWS CLI Command Reference: lambda update-function-configuration - https://docs.aws.amazon.com/cli/latest/reference/lambda/update-function-configuration.html
- AWS CLI Command Reference: logs start-query - https://docs.aws.amazon.com/cli/latest/reference/logs/start-query.html
- AWS Lambda documentation: Viewing CloudWatch logs for Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs-view.html
- AWS Lambda documentation: Using CloudWatch metrics with Lambda - https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics.html
- AWS Lambda pricing - https://aws.amazon.com/lambda/pricing/
- AWS SAM documentation: AWS::Serverless::Function - https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html
- Terraform Registry: aws_lambda_function resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function

## Issues Found
- The post used `aws cloudwatch get-metric-statistics` with a `MaxMemoryUsed` metric in the `AWS/Lambda` namespace. `Max Memory Used` is available in Lambda REPORT logs and as the CloudWatch Logs Insights field `@maxMemoryUsed`, not as a standard Lambda CloudWatch metric. Replaced the command with an `aws logs start-query` / `aws logs get-query-results` example that queries REPORT logs for maximum memory usage.
- The original memory monitoring command used `date -v-7d`, which is BSD/macOS-specific. The replacement uses epoch seconds with shell arithmetic, which works in common Bash environments.

## Review Notes
- AWS CLI was not installed in the local workspace, so CLI syntax was verified against the official AWS CLI command reference instead of local `--help` output.
- The cost calculator uses the first-tier x86 on-demand duration price for us-east-1 and does not model Arm pricing, tiered duration pricing, provisioned concurrency, SnapStart, or Compute Savings Plans. That is acceptable for the post's illustrative comparison, but production cost modeling should use the current AWS pricing page or AWS Pricing Calculator.
