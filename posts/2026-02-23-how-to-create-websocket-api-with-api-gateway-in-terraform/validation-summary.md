# Validation Summary: How to Create WebSocket API with API Gateway in Terraform

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Terraform (HCL)
- AWS API Gateway v2 (WebSocket APIs)
- AWS Lambda (Node.js runtime)
- AWS IAM (roles and policies)
- AWS DynamoDB (connection storage)
- AWS CloudWatch Logs

## Sources Consulted
- AWS API Gateway WebSocket APIs documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html
- AWS WebSocket selection expressions: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-selection-expressions.html
- AWS WebSocket routes: https://docs.aws.amazon.com/apigateway/latest/developerguide/websocket-api-develop-routes.html
- AWS API Gateway ARN reference: https://docs.aws.amazon.com/apigateway/latest/developerguide/arn-format-reference.html
- Terraform AWS provider `aws_apigatewayv2_api` docs
- Terraform AWS provider `aws_apigatewayv2_integration` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_integration
- Terraform AWS provider `aws_apigatewayv2_stage` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_stage
- Terraform AWS provider `aws_lambda_function` docs
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html

## Issues Found

1. **Outdated Lambda runtime (`nodejs18.x`)**: All four Lambda functions used `runtime = "nodejs18.x"`. By February 2026, Node.js 18.x is in its final deprecation phase in AWS Lambda — AWS blocked function creation in October 2025 and the hard cutoff for updates was March 9, 2026. Updated all four `aws_lambda_function` resources to `runtime = "nodejs20.x"`, which is a supported LTS runtime.

2. **Missing required `integration_method` on `aws_apigatewayv2_integration`**: Per the Terraform AWS provider documentation, `integration_method` "must be specified if `integration_type` is not `MOCK`." For Lambda integrations (`AWS_PROXY`), this must be `"POST"`. Without this attribute, `terraform plan` would fail. Added `integration_method = "POST"` to all four integration resources (`connect`, `disconnect`, `send_message`, `default`).

## Review Notes

- The `route_selection_expression = "$request.body.action"` syntax is canonical and correct for WebSocket APIs.
- The `auto_deploy = true` attribute on `aws_apigatewayv2_stage` is correctly supported for WebSocket APIs (not only HTTP APIs).
- The Lambda permission `source_arn` format `${aws_apigatewayv2_api.websocket.execution_arn}/*/$connect` is valid; in HCL, `$` followed by anything other than `{` is treated as a literal character, so `$connect`/`$disconnect`/`$default` interpolate correctly to the WebSocket route keys.
- The `execute-api:ManageConnections` IAM permission is the correct action for Lambda to use `@connections` to post messages back to clients.
- Minor stylistic observation (not a technical error): the example throttling configuration uses `throttling_burst_limit = 500` and `throttling_rate_limit = 1000`. Typically burst is set higher than rate (the burst is the token bucket size). This is valid HCL and AWS will accept the values, but readers may want to reverse them in production configurations.
- Lambda function code itself is not included in the post — readers must supply their own `connect.zip`, `disconnect.zip`, `sendMessage.zip`, `default.zip` artifacts. This is implied by the `filename` references but not explicitly called out.
