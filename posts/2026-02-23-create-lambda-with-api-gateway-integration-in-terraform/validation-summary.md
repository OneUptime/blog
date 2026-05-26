# Validation Summary: How to Create Lambda with API Gateway Integration in Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform / HCL
- AWS Lambda
- Amazon API Gateway HTTP APIs
- Amazon API Gateway REST APIs
- AWS IAM
- Amazon CloudWatch Logs
- AWS Certificate Manager
- Amazon Route 53

## Sources Consulted
- AWS Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- Terraform AWS provider `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS provider `aws_apigatewayv2_api`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_api
- Terraform AWS provider `aws_apigatewayv2_integration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_integration
- Terraform AWS provider `aws_apigatewayv2_route`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_route
- Terraform AWS provider `aws_apigatewayv2_stage`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_stage
- Terraform AWS provider `aws_apigatewayv2_domain_name`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_domain_name
- Terraform AWS provider `aws_apigatewayv2_api_mapping`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_api_mapping
- Terraform AWS provider `aws_api_gateway_rest_api`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_rest_api
- Terraform AWS provider `aws_api_gateway_integration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_integration
- Terraform AWS provider `aws_api_gateway_stage`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_stage
- Terraform AWS provider `aws_api_gateway_account`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_account
- Terraform AWS provider `aws_lambda_permission`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- API Gateway HTTP API access log variables: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-logging-variables.html
- API Gateway REST API CloudWatch logging: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-logging.html
- Choose between REST APIs and HTTP APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html
- API Gateway ARN reference: https://docs.aws.amazon.com/apigateway/latest/developerguide/arn-format-reference.html
- API Gateway usage plans and API keys for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html
- Use AWS WAF to protect REST APIs in API Gateway: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-control-access-aws-waf.html

## Issues Found
- The Lambda example used `runtime = "nodejs20.x"`. AWS lists Node.js 20 as deprecated starting on April 30, 2026, so I updated the example to `nodejs22.x`.
- The introduction stated broadly that API Gateway handles request validation. AWS documents request validation as a REST API feature, so I qualified the wording to avoid implying HTTP APIs support it.
- The REST API stage enabled CloudWatch access logs but did not configure the regional API Gateway CloudWatch role. AWS requires `cloudWatchRoleArn` to be set for REST API CloudWatch logging, so I added an IAM role, the `AmazonAPIGatewayPushToCloudWatchLogs` managed policy attachment, an `aws_api_gateway_account` resource, and a stage dependency on that account configuration.

## Review Notes
- The API Gateway v2 Lambda proxy integration, route syntax, `$default` stage, access log variables, custom domain mapping, Route 53 alias attributes, and Lambda invoke permissions matched current Terraform provider and AWS documentation.
- The REST API Lambda proxy integration uses the correct `integration_http_method = "POST"` setting for Lambda integrations.
- `terraform` was not installed in the review environment, so validation was documentation-based rather than CLI schema-based.
