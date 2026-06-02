# Validation Summary: How to Set Up Lambda Proxy Integration with API Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- Amazon API Gateway REST APIs
- Lambda proxy integration
- AWS CDK
- AWS SAM
- Node.js
- TypeScript
- CORS
- API Gateway binary media types

## Sources Consulted
- AWS API Gateway Developer Guide: Lambda proxy integrations in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
- AWS API Gateway Developer Guide: Binary media types for REST APIs in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-payload-encodings.html
- AWS API Gateway Developer Guide: CORS for REST APIs in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html
- AWS CDK API Reference: LambdaIntegrationOptions - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.LambdaIntegrationOptions.html
- AWS SAM Developer Guide: Api event source for AWS::Serverless::Function - https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-function-api.html
- AWS Lambda Developer Guide: Invoking a Lambda function using an Amazon API Gateway endpoint - https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html

## Issues Found
- The response-format wording said the Lambda response had to match one exact object shape, but AWS documents optional proxy response fields such as `isBase64Encoded`, `headers`, and `multiValueHeaders`. Updated the wording and sample response to show `isBase64Encoded`.
- The sample handler's response formatter treated all falsy values as an empty response body. Updated it to stringify any non-null body so values such as `0` or `false` are not dropped.
- The examples returned CORS headers that advertised `OPTIONS`, but the handler, CDK example, and SAM template did not define `OPTIONS` handling. Added an `OPTIONS` case and matching API methods/events for the documented routes.
- The binary response guidance omitted REST API details for response `Content-Type` and the first `Accept` header behavior. Added the configured binary media type and `*/*` caveat from the API Gateway documentation.
- The performance section made an unsupported absolute latency claim. Reworded it to describe the mapping-template simplification and recommend measuring latency for the actual API.

## Review Notes
The examples target API Gateway REST APIs, not HTTP APIs. HTTP APIs use different payload format versions and CORS behavior, so future updates should keep that distinction explicit if HTTP API examples are added.
