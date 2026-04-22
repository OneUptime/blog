# Validation Summary: How to Build a Serverless API Backend with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- Amazon API Gateway HTTP APIs
- Amazon DynamoDB
- Amazon Cognito
- Amazon CloudWatch Logs
- AWS X-Ray
- OpenTofu / HCL
- AWS provider resources

## Sources Consulted
- AWS Lambda supported runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda execution roles: https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html
- AWS Lambda X-Ray tracing: https://docs.aws.amazon.com/lambda/latest/dg/services-xray.html
- AWS Lambda function URL authorization: https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html
- API Gateway HTTP API routes: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-routes.html
- API Gateway JWT authorizers for HTTP APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html
- API Gateway CloudWatch logging: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-logging.html
- API Gateway X-Ray support: https://docs.aws.amazon.com/xray/latest/devguide/xray-services-apigateway.html
- Amazon Cognito CreateUserPoolClient API: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_CreateUserPoolClient.html
- HashiCorp AWS provider aws_lambda_function: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_function.html.markdown
- HashiCorp AWS provider aws_lambda_function_url: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_function_url.html.markdown
- HashiCorp AWS provider aws_apigatewayv2_stage: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/apigatewayv2_stage.html.markdown
- HashiCorp AWS provider aws_apigatewayv2_integration: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/apigatewayv2_integration.html.markdown
- HashiCorp AWS provider aws_apigatewayv2_route: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/apigatewayv2_route.html.markdown
- HashiCorp AWS provider aws_apigatewayv2_authorizer: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/apigatewayv2_authorizer.html.markdown
- HashiCorp AWS provider aws_cognito_user_pool_client: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cognito_user_pool_client.html.markdown
- HashiCorp AWS provider aws_dynamodb_table: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/dynamodb_table.html.markdown
- OpenTofu jsonencode function: https://opentofu.org/docs/language/functions/jsonencode/
- OpenTofu filebase64sha256 function: https://opentofu.org/docs/v1.8/language/functions/filebase64sha256/

## Issues Found
- The Lambda runtime used `nodejs20.x`, which is scheduled for AWS Lambda deprecation on April 30, 2026. Updated it to `nodejs22.x`, which AWS lists as supported until April 30, 2027.
- The Lambda execution role only granted DynamoDB permissions. Added `AWSLambdaBasicExecutionRole` for CloudWatch Logs and `AWSXRayDaemonWriteAccess` for active X-Ray tracing.
- The Lambda environment hard-coded `us-east-1`. Added `data "aws_region" "current"` and used the configured provider Region instead.
- The Lambda function URL used `authorization_type = "NONE"`, which would create an unauthenticated direct path to the same handler and bypass the Cognito-protected API Gateway route. Changed it to `AWS_IAM`.
- The API Gateway stage referenced `aws_cloudwatch_log_group.api_gw` without defining it. Added the CloudWatch log group, API Gateway CloudWatch role, managed policy attachment, and regional `aws_api_gateway_account` configuration required for logging.
- The API Gateway Lambda proxy integration omitted `integration_method`, which the AWS provider documents as required for non-MOCK integrations. Added `integration_method = "POST"`.
- The API only routed `ANY /items/{proxy+}`, which catches child paths but not the `/items` collection route. Added `ANY /items`.
- The Cognito JWT authorizer was created but not attached to any API Gateway route. Added `authorization_type = "JWT"` and `authorizer_id` to both item routes.
- The Cognito app client configured OAuth flows, scopes, and callback URLs without enabling OAuth features. Added `allowed_oauth_flows_user_pool_client = true` and `supported_identity_providers = ["COGNITO"]`.
- The JWT issuer hard-coded a Region-specific Cognito URL. Replaced it with `https://${aws_cognito_user_pool.api.endpoint}` so it matches the actual user pool endpoint.
- The summary claimed X-Ray tracing across the full API Gateway-to-Lambda path. AWS documents API Gateway X-Ray tracing support for REST APIs, while this post uses HTTP APIs, so the summary now describes CloudWatch access logs plus Lambda X-Ray tracing.

## Review Notes
Could not run `tofu validate` or `terraform validate` because neither CLI is installed in the local environment. The snippets were checked manually against official AWS, OpenTofu, and AWS provider documentation.
