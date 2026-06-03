# Validation Summary: How to Use Custom Authorizers with API Gateway and Lambda

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon API Gateway REST APIs
- API Gateway Lambda authorizers
- AWS Lambda
- AWS CDK v2
- Node.js
- JSON Web Tokens
- AWS SDK for JavaScript v3
- Amazon DynamoDB
- API Gateway Gateway Responses and CORS headers

## Sources Consulted
- AWS API Gateway Developer Guide: Use API Gateway Lambda authorizers - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html
- AWS API Gateway Developer Guide: Input to an API Gateway Lambda authorizer - https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-lambda-authorizer-input.html
- AWS API Gateway Developer Guide: Output from an API Gateway Lambda authorizer - https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-lambda-authorizer-output.html
- AWS CDK v2 API Reference: TokenAuthorizerProps - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.TokenAuthorizerProps.html
- AWS CDK v2 API Reference: GatewayResponseOptions - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.GatewayResponseOptions.html
- OneUptime referenced CORS blog link - https://oneuptime.com/blog/post/2026-02-12-handle-cors-lambda-api-gateway/view

## Issues Found
- The authorization caching section said that method-specific cached policies "won't work for other endpoints." AWS documents that API Gateway caches the policy and evaluates it for later requests, so a cached policy scoped to one method/resource can cause other methods/resources to be implicitly denied. Updated the wording to explain that other endpoints can be implicitly denied until the cache expires.

## Review Notes
- The examples target REST API Lambda authorizers, not HTTP API Lambda authorizers. The post consistently uses `aws-cdk-lib/aws-apigateway`, `TokenAuthorizer`, `methodArn`, and REST API Gateway Responses, so this is technically coherent.
- The CDK example uses `NODEJS_20_X`, which remains a supported Lambda runtime, although newer runtimes may also be available.
- The JWT secret is shown as an environment variable and the CDK snippet uses an inline placeholder for brevity. The post correctly notes that production deployments should use Secrets Manager or Parameter Store instead.
