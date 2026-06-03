# Validation Summary: How to Create API Gateway with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS API Gateway REST APIs
- AWS API Gateway HTTP APIs
- Terraform AWS provider
- AWS Lambda proxy integrations
- API Gateway JWT authorizers
- API Gateway custom domains
- Amazon Route 53 alias records
- Amazon CloudWatch access logs and metrics

## Sources Consulted
- Terraform AWS provider documentation: aws_api_gateway_stage - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_stage
- Terraform AWS provider documentation: aws_apigatewayv2_stage - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_stage
- Terraform AWS provider documentation: aws_apigatewayv2_api - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_api
- Terraform AWS provider documentation: aws_apigatewayv2_integration - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_integration
- Terraform AWS provider documentation: aws_apigatewayv2_authorizer - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_authorizer
- Terraform AWS provider documentation: aws_apigatewayv2_api_mapping - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_api_mapping
- Terraform AWS provider documentation: aws_api_gateway_method_settings - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_method_settings
- Terraform AWS provider documentation: aws_lambda_permission - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- AWS Lambda Developer Guide: Invoking a Lambda function using an Amazon API Gateway endpoint - https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html
- AWS API Gateway Developer Guide: Set up a method request in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-method-settings-method-request.html
- AWS API Gateway Developer Guide: Set up a proxy integration with a proxy resource - https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-set-up-simple-proxy.html
- AWS CloudFormation documentation: AWS::ApiGatewayV2::Stage AccessLogSettings - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-apigatewayv2-stage-accesslogsettings.html

## Issues Found
- The REST API stage access log configuration only set `destination_arn`. Terraform requires `format` in `access_log_settings`, and AWS access log format rules require a format that includes a request identifier. Added a JSON log format using API Gateway `$context` variables.
- The HTTP API example created a separate API Gateway v2 API but did not grant that API permission to invoke the Lambda function. Added an `aws_lambda_permission` scoped to `aws_apigatewayv2_api.http_api.execution_arn`.

## Review Notes
The linked OneUptime Cognito and ACM posts returned HTTP 200 during validation. The examples remain partial infrastructure snippets and assume supporting resources such as the Lambda function, CloudWatch log group, ACM certificate, Cognito user pool/client, and Route 53 zone already exist.
