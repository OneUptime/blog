# Validation Summary: How to Create Serverless API Backend with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS API Gateway (HTTP API / API Gateway v2)
- AWS Lambda (Node.js runtime)
- AWS DynamoDB
- AWS IAM
- AWS CloudWatch Logs

## Sources Consulted
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda Node.js 18 end-of-support announcement (extended to March 9, 2026)
- AWS Lambda Node.js 22 runtime announcement: https://aws.amazon.com/blogs/compute/node-js-22-runtime-now-available-in-aws-lambda/
- Terraform AWS provider — `aws_dynamodb_table`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- Terraform AWS provider — `aws_apigatewayv2_api`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_api
- Terraform AWS provider — `aws_apigatewayv2_stage`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_stage
- Terraform AWS provider — `aws_apigatewayv2_integration`, `aws_apigatewayv2_route`, `aws_lambda_permission`, `aws_lambda_function`, `aws_iam_role`, `aws_iam_role_policy`, `aws_cloudwatch_log_group`

## Issues Found
- **Deprecated Lambda runtime**: All five `aws_lambda_function` resources used `runtime = "nodejs18.x"`. AWS Lambda fully deprecated Node.js 18 on March 9, 2026 — both function creation and updates are now blocked on this runtime. Updated all five occurrences to `nodejs22.x`, which is the current LTS-stable runtime recommended for new functions in mid-2026 (Node.js 20 entered Phase 1 deprecation in April 2026, so `nodejs22.x` is the safer choice).

## Review Notes
- The DynamoDB schema, `point_in_time_recovery`, `server_side_encryption`, and `global_secondary_index` blocks are all valid and use current attribute names.
- The HTTP API (`aws_apigatewayv2_api` with `protocol_type = "HTTP"`), `cors_configuration`, `aws_apigatewayv2_stage` with `$default` name and `auto_deploy`, `aws_apigatewayv2_integration` with `payload_format_version = "2.0"`, and route/integration wiring are correct.
- `aws_lambda_permission` with `for_each` and `source_arn = "${aws_apigatewayv2_api.main.execution_arn}/*/*"` is the standard pattern for granting API Gateway v2 invoke permissions to Lambda.
- The `aws_apigatewayv2_stage.invoke_url` attribute used in the output is a valid computed attribute.
- The IAM trust policy and the managed `AWSLambdaBasicExecutionRole` ARN are correct.
- Minor (not changed): The post uses `var.environment` in tags without defining the variable in the snippet. This is acceptable in a tutorial that focuses on the resource configuration, but a reader would need to declare it (`variable "environment" {}`) elsewhere in their module.
- Minor (not changed): The DynamoDB `server_side_encryption { enabled = true }` block enables encryption with an AWS-owned key. DynamoDB tables are actually encrypted at rest by default with AWS-owned keys even without this block — the block is primarily useful when switching to an AWS-managed (`aws/dynamodb`) or customer-managed KMS key. Leaving the snippet as-is since it is not technically wrong.
- Minor (not changed): The `dynamodb:Scan` permission is granted on `Resource = aws_dynamodb_table.items.arn`; scans on GSIs would require the `/index/*` resource, which is also granted — fine.
