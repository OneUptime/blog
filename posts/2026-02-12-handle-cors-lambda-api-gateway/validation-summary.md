# Validation Summary: How to Handle CORS in Lambda Behind API Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- Amazon API Gateway REST APIs
- Amazon API Gateway HTTP APIs
- AWS CDK
- AWS Serverless Application Model (SAM)
- JavaScript / Node.js Lambda handlers
- Browser CORS behavior and HTTP headers

## Sources Consulted
- Amazon API Gateway Developer Guide: Lambda proxy integrations in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
- Amazon API Gateway Developer Guide: Configure CORS for HTTP APIs in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-cors.html
- AWS Serverless Application Model Developer Guide: CorsConfiguration - https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-api-corsconfiguration.html
- AWS CDK API Reference: aws_apigateway.CorsOptions - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.CorsOptions.html
- AWS CDK API Reference: aws_apigatewayv2.HttpApiProps - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigatewayv2.HttpApiProps.html
- AWS CDK API Reference: aws_apigatewayv2_integrations.HttpLambdaIntegration - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigatewayv2_integrations.HttpLambdaIntegration.html
- MDN Web Docs: Cross-Origin Resource Sharing (CORS) - https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- MDN Web Docs: Access-Control-Allow-Credentials - https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Credentials

## Issues Found
- The SAM section incorrectly stated that the shown SAM `Cors` configuration sets up CORS for both preflight and actual responses. AWS SAM documentation states that when using Lambda proxy integration, the backend must still return the CORS headers. Updated the sentence to clarify that the SAM snippet configures preflight responses and that Lambda must return CORS headers for actual responses.

## Review Notes
- The REST API and HTTP API guidance matches AWS documentation: REST API Lambda proxy responses must include CORS headers from Lambda, while configured HTTP APIs add CORS headers through API Gateway for CORS requests.
- The CDK snippets use current CDK v2 constructs and property names.
- The CORS multiple-origin and `Vary: Origin` guidance matches MDN guidance.
- The internal CloudWatch Logs link corresponds to an existing post directory in this repository.
