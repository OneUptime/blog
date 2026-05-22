# Validation Summary: How to Use Dynamic Blocks for API Gateway Integration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform dynamic blocks and `for_each`
- AWS Provider for Terraform
- Amazon API Gateway REST APIs
- Amazon API Gateway HTTP APIs / API Gateway v2
- AWS Lambda proxy integrations

## Sources Consulted
- Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform AWS Provider `aws_api_gateway_resource`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_resource
- Terraform AWS Provider `aws_api_gateway_method`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_method
- Terraform AWS Provider `aws_api_gateway_integration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_integration
- Terraform AWS Provider `aws_api_gateway_method_response`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_method_response
- Terraform AWS Provider `aws_api_gateway_request_validator`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_request_validator
- Terraform AWS Provider `aws_apigatewayv2_api`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_api
- Terraform AWS Provider `aws_apigatewayv2_integration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_integration
- Terraform AWS Provider `aws_apigatewayv2_route`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_route
- Terraform AWS Provider `aws_apigatewayv2_stage`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_stage
- AWS CloudFormation `AWS::ApiGatewayV2::Integration`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigatewayv2-integration.html
- Amazon API Gateway integration type documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-integration-types.html

## Issues Found
- The REST API route variable used `path` as if it could represent a full URL path, but `aws_api_gateway_resource.path_part` is only the last path segment. Changed the variable to `path_part`, updated the resource reference, and added an inline note.
- The API Gateway v2 integration example omitted `integration_method`, which the Terraform AWS Provider requires for non-`MOCK` integrations. Added a `method` field and wired it to `integration_method`.
- The HTTP API Lambda integration examples used Lambda function ARNs as integration URIs. Updated the examples to use the API Gateway Lambda invocation URI form shown in AWS documentation.
- The API Gateway v2 stage access log dynamic block omitted the required `format` argument. Added `format = var.access_log_format`.
- The HTTP API stage route settings included `logging_level`, which the provider documents as WebSocket-only for API Gateway v2 route settings. Removed it from the HTTP API example.
- Some wording described `for_each`-based resource generation as dynamic blocks, and mentioned CORS/authorization as dynamic block examples even though the shown configuration uses regular nested blocks and arguments. Updated the wording to distinguish `for_each`, `flatten`, and true dynamic nested blocks.

## Review Notes
Terraform is not installed in this environment, so I could not run `terraform validate`. The review was performed against official Terraform language documentation, Terraform AWS Provider documentation, and AWS API Gateway documentation.
