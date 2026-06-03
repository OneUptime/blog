# Validation Summary: How to Enable CORS Properly on API Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS API Gateway REST APIs
- AWS API Gateway HTTP APIs
- AWS CLI
- AWS CloudFormation
- AWS SAM
- AWS Lambda proxy integrations
- CORS
- Python

## Sources Consulted
- AWS API Gateway Developer Guide: CORS for REST APIs in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html
- AWS API Gateway Developer Guide: Configure CORS for HTTP APIs in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-cors.html
- AWS CloudFormation Template Reference: AWS::ApiGatewayV2::Api Cors - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-apigatewayv2-api-cors.html
- AWS CloudFormation Template Reference: AWS::ApiGateway::GatewayResponse - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigateway-gatewayresponse.html
- AWS CloudFormation Template Reference: AWS::ApiGateway::Method - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigateway-method.html
- AWS SAM Developer Guide: CorsConfiguration - https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-api-corsconfiguration.html
- AWS CLI Command Reference: apigateway put-integration-response - https://docs.aws.amazon.com/cli/latest/reference/apigateway/put-integration-response.html
- MDN Web Docs: Cross-Origin Resource Sharing (CORS) - https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- MDN Web Docs: Using the Fetch API - https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
- MDN Web Docs: Request credentials property - https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials

## Issues Found
- The HTTP API section said no OPTIONS method was needed without mentioning the `$default` route plus authorizer exception. Updated the text to explain that API Gateway usually handles preflight automatically, but an unauthenticated `OPTIONS /{proxy+}` route is needed when a `$default` route with an authorizer would otherwise catch OPTIONS requests.
- The HTTP API section said API Gateway adds CORS headers to all responses. Updated it to say API Gateway adds CORS headers to CORS responses that include an `Origin` header, matching AWS documentation.
- The multiple-origin REST API section only described dynamic origin handling for the Lambda actual response. Updated it to clarify that the same dynamic origin handling must apply to the preflight response.
- The multiple-origin Lambda example said disallowed origins should not set `Access-Control-Allow-Origin`, but the code returned the first allowed origin. Updated the code to build headers dynamically and only set `Access-Control-Allow-Origin` when the request origin is allowed.

## Review Notes
- The AWS CLI commands and CloudFormation/SAM property names matched current AWS documentation. The local environment did not have the AWS CLI installed, so CLI syntax was verified against the official AWS CLI command reference instead of local `aws --help` output.
- The Python Lambda snippets are illustrative and assume `get_data()` exists in the application code.
