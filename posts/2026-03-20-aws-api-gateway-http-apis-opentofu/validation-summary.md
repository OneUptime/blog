# Validation Summary: How to Create AWS API Gateway HTTP APIs with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / HCL
- AWS API Gateway HTTP APIs
- AWS Lambda
- JWT authorizers
- CORS
- CloudWatch Logs
- AWS ACM custom domains

## Sources Consulted
- AWS API Gateway: Choose between REST APIs and HTTP APIs - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html
- AWS API Gateway: Create AWS Lambda proxy integrations for HTTP APIs - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
- AWS API Gateway: Control access to HTTP APIs with JWT authorizers - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html
- AWS API Gateway: Configure CORS for HTTP APIs - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-cors.html
- AWS API Gateway: Configure logging for HTTP APIs - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-logging.html
- AWS API Gateway: Customize HTTP API access logs - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-logging-variables.html
- AWS API Gateway: Throttle requests to your HTTP APIs - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-throttling.html
- AWS API Gateway: ARN format reference - https://docs.aws.amazon.com/apigateway/latest/developerguide/arn-format-reference.html
- AWS Lambda: Invoking a Lambda function using an Amazon API Gateway endpoint - https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html
- Terraform Registry: `aws_apigatewayv2_api_mapping` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_api_mapping
- Terraform Registry: `aws_apigatewayv2_stage` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_stage
- Terraform Registry: `aws_apigatewayv2_authorizer` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_authorizer

## Issues Found
- The opening paragraph claimed HTTP APIs were "up to 60% cheaper and 60% faster" than REST APIs. I replaced that with the doc-supported lower-cost/lower-latency characterization because the exact numbers were not accurate as written.
- The Lambda integration comment said 29 seconds was the maximum timeout. I corrected it to reflect the current HTTP API limit of up to 30 seconds.
- The `$default` route comment implied API Gateway itself handles 404 responses. I clarified that the catch-all route enables application-level 404 handling in Lambda for unmatched requests.
- The multi-route Lambda example was missing the required `aws_lambda_permission` resources for each function. I updated the route map to include both `invoke_arn` and `function_name`, then added per-function invoke permissions so the example works as described.
- The custom-domain example used `api_mapping_key = ""` for a root mapping. I removed that argument because root-path mappings are represented by omitting the optional mapping key.

## Review Notes
- With `payload_format_version = "2.0"`, Lambda receives the HTTP API v2 event shape. If this example is later adapted to use a non-root custom-domain API mapping and the backend needs that base path in the event payload, AWS documents that payload format `1.0` exposes that mapping value via `path` while `2.0` does not expose it in `rawPath`.
