# Validation Summary: How to Configure API Gateway Stage Variables with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS API Gateway REST APIs
- AWS Lambda
- AWS CLI
- HCL
- Python

## Sources Consulted
- OpenTofu string templates and `$${` escaping: https://opentofu.org/docs/language/expressions/strings/
- API Gateway stage variables for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/stage-variables.html
- API Gateway stage variable reference for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/aws-api-gateway-stage-variables-reference.html
- API Gateway setup for REST API stage variables: https://docs.aws.amazon.com/apigateway/latest/developerguide/amazon-api-gateway-using-stage-variables.html
- Lambda proxy integration event format for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
- API Gateway ARN format reference: https://docs.aws.amazon.com/apigateway/latest/developerguide/arn-format-reference.html
- API Gateway logging for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-logging.html
- AWS Lambda permissions for API Gateway: https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html
- AWS CLI `apigateway get-stage`: https://docs.aws.amazon.com/cli/latest/reference/apigateway/get-stage.html
- Terraform AWS provider `aws_api_gateway_stage`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_stage
- Terraform AWS provider `aws_api_gateway_integration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_integration
- Terraform AWS provider `aws_lambda_permission`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission

## Issues Found
- The `access_log_settings` blocks were missing the required `format` argument. I added a valid JSON access log format that includes `requestId` and `extendedRequestId`, which AWS documents as required or recommended for access logs.
- The post used `source_arn` values like `/*/prod/*` and `/*/staging/*`, which do not match the documented `execute-api` ARN shape of `api-id/stage/http-method/resource-path`. I corrected them to `/prod/*/*` and `/staging/*/*`.
- The Python example used `event.get('stageVariables', {})`, but API Gateway proxy events can include `"stageVariables": null`. I changed this to `event.get('stageVariables') or {}` so the handler works when that field is null.
- The prerequisites did not mention the API Gateway CloudWatch Logs permissions required when enabling stage access logs. I added that prerequisite because AWS requires the account-level CloudWatch logging role configuration for REST API logging.

## Review Notes
- The post correctly targets API Gateway REST APIs by using `aws_api_gateway_*` resources rather than `aws_apigatewayv2_*` resources.
- The stage-variable Lambda integration pattern is valid for using a Lambda alias, and the `$${...}` escaping in the OpenTofu string is correct.
- Stage variables are a string-to-string map and are not intended for sensitive data. Lambda stage-variable substitutions also require the Lambda function to be in the same AWS account as the API.
