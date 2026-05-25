# Validation Summary: How to Build a Serverless Architecture with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS Lambda
- Amazon API Gateway HTTP APIs
- Amazon DynamoDB
- Amazon S3 event notifications
- Amazon CloudWatch Logs and alarms
- AWS IAM

## Sources Consulted
- Terraform AWS provider `aws_apigatewayv2_integration` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_integration
- Terraform AWS provider `aws_lambda_permission` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- Terraform AWS provider `aws_s3_bucket_notification` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_notification
- Terraform AWS provider `aws_lambda_function` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS provider `aws_cloudwatch_log_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group
- Terraform AWS provider `aws_dynamodb_table` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- AWS Lambda documentation for API Gateway permissions: https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html
- Amazon API Gateway documentation for HTTP API Lambda proxy integrations: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
- AWS Lambda Node.js runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- Terraform CLI `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3

## Issues Found
- The API Gateway stage configured `access_log_settings` with `aws_cloudwatch_log_group.api.arn`, but the example did not define that log group. Added an `aws_cloudwatch_log_group` resource for API Gateway access logs.
- The HTTP API Lambda integration omitted `integration_method`. Added `integration_method = "POST"` to align with the Terraform AWS provider documentation for non-MOCK integrations and AWS's Lambda proxy integration examples.
- The API Gateway module did not grant API Gateway permission to invoke the Lambda function. Added an `aws_lambda_permission` resource with the `apigateway.amazonaws.com` principal and a source ARN scoped to the API execution ARN, and passed `lambda_function_name` from the root module.
- The root module used the `nodejs20.x` Lambda runtime. As of the validation date, AWS Lambda's supported Node.js runtime list has moved on to Node.js 22 and Node.js 24, so the example now uses `nodejs22.x`.
- The S3 bucket notification example created the Lambda permission but did not make the notification resource depend on it. Added `depends_on = [aws_lambda_permission.s3_invoke]`, matching the Terraform AWS provider pattern so S3 can validate the Lambda destination during apply.

## Review Notes
- The snippets assume supporting variables and module outputs exist, including values such as `var.aws_region`, `local.common_tags`, `table_arn`, `table_name`, `invoke_arn`, `function_arn`, and `function_name`.
- The S3 backend example assumes the backend bucket already exists before `terraform init`, which is consistent with Terraform backend behavior.
- The IAM examples are intentionally minimal. In a production module, `dynamodb:Scan` should be avoided unless the function truly needs it, and DynamoDB resource ARNs may need index ARNs if the function queries secondary indexes.
